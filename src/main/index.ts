import { app, shell, BrowserWindow, session } from 'electron'
import { join } from 'path'
import { runMigrations } from './db/migrate'
import { registerIpcHandlers, invokeHandlerForPhone } from './ipc/registerIpc'
import { performBackup, shouldRunDailyBackup } from './backup/backupManager'
import { installGlobalErrorLogging, logInfo, logError } from './logger'
import { migrateLegacyAppDataDirIfNeeded } from '@shared/paths'
import { startMcpHttpServer, stopMcpHttpServer } from './mcp/httpServer'
import { initPhoneServer, startPhoneServerIfEnabled, stopPhoneServer } from './phone/phoneServer'
import { initCustomize } from './customize/customize'
import { initUpdater } from './updater'
import { ensureTray, isQuitting, launchedHidden, markQuitting } from './phone/background'
import { getAllSettings } from './ipc/settingsRepo'

// Pin userData/productName so the MCP server (standalone Node process) can
// compute the exact same %APPDATA% path without needing Electron itself.
app.setName('Renvor')

// Renamed from "gs-field-ops" after Phase 10 - carry over any existing
// database before anything tries to open the (new, otherwise-empty) one.
migrateLegacyAppDataDirIfNeeded()

installGlobalErrorLogging()

const isDev = !app.isPackaged

// One Renvor at a time: a second launch (e.g. the tray copy is already running
// and the user clicks the shortcut) just brings the first one forward.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()

function showMainWindow(): void {
  const win = BrowserWindow.getAllWindows()[0]
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

app.on('second-instance', showMainWindow)

function trayIconPath(): string {
  return join(__dirname, '../renderer/icon-192.png')
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#0B0E12',
    autoHideMenuBar: true,
    // Packaged Windows builds get this from electron-builder.yml's win.icon
    // instead (baked into the .exe); this only matters for unpacked/dev runs.
    icon: join(__dirname, '../../build/icon.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.once('ready-to-show', () => {
    // Started with Windows: stay in the tray, but only if phone access is on -
    // otherwise an invisible app would be confusing.
    if (launchedHidden() && getAllSettings().phoneAccessEnabled) {
      ensureTray({ iconPath: trayIconPath(), showWindow: showMainWindow })
    } else {
      win.show()
    }
  })

  // With phone access on the app has to keep running for the phone to work, so
  // closing the window hides it to the tray; "Quit Renvor" there really quits.
  win.on('close', (event) => {
    if (isQuitting() || !getAllSettings().phoneAccessEnabled) return
    event.preventDefault()
    win.hide()
    ensureTray({ iconPath: trayIconPath(), showWindow: showMainWindow })
  })

  // Skipped under the Playwright e2e suite: an auto-opened DevTools window
  // would otherwise race the app window for electronApp.firstWindow().
  if (isDev && !process.env.PLAYWRIGHT_TEST) {
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
  if (!gotLock) return
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

  // Packaged: __dirname is inside app.asar, but drizzle/ was shipped as an
  // extraResource OUTSIDE the asar (electron-builder.yml), so it's a sibling
  // of app.asar under resourcesPath, not two dirs up from __dirname.
  runMigrations(isDev ? join(__dirname, '../../drizzle') : join(process.resourcesPath, 'drizzle'))
  registerIpcHandlers(join(__dirname, '../..'))
  initCustomize({ projectRoot: join(__dirname, '../..') })
  // out/main/index.js -> out/renderer (inside app.asar when packaged, which fs reads transparently)
  initPhoneServer({ rendererDir: join(__dirname, '../renderer'), invoke: invokeHandlerForPhone })
  createWindow()
  logInfo(`App ready (version ${app.getVersion()}, ${isDev ? 'dev' : 'packaged'})`)

  startMcpHttpServer()
    .then((result) => {
      if (!result.ok) console.error('MCP HTTP server failed to start:', result.error)
    })
    .catch((err) => logError('MCP HTTP server failed to start', err))

  initUpdater()

  startPhoneServerIfEnabled().catch((err) => logError('Phone server failed to start', err))

  if (shouldRunDailyBackup()) {
    performBackup()
      .then(() => logInfo('Daily backup completed'))
      .catch((err) => {
        console.error('Daily backup failed:', err)
        logError('Daily backup failed', err)
      })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Back up once more on every close, not just the once-a-day check above.
let quittingAfterBackup = false
app.on('before-quit', (event) => {
  markQuitting()
  if (quittingAfterBackup) return
  event.preventDefault()
  performBackup()
    .catch((err) => {
      console.error('Exit backup failed:', err)
      logError('Exit backup failed', err)
    })
    .finally(() => {
      stopMcpHttpServer()
      stopPhoneServer()
      quittingAfterBackup = true
      app.quit()
    })
})
