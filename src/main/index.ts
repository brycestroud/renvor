import { app, shell, BrowserWindow, session } from 'electron'
import { join } from 'path'
import { runMigrations } from './db/migrate'
import { registerIpcHandlers } from './ipc/registerIpc'

// Pin userData/productName so the MCP server (standalone Node process) can
// compute the exact same %APPDATA% path without needing Electron itself.
app.setName('gs-field-ops')

const isDev = !app.isPackaged

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#0B0E12',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.once('ready-to-show', () => win.show())

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' })
  }

  // Open external links in the OS browser, never inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Strict CSP only in production. In dev, the renderer is served by Vite's
  // own dev server (HMR + React Refresh inject an inline preamble script),
  // which a locked-down script-src would break; the packaged app loads
  // static built files instead and doesn't need the inline script at all.
  if (!isDev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self';"
          ]
        }
      })
    })
  }

  runMigrations()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
