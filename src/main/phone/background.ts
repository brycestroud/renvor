/**
 * "Always available" support for the phone app: with phone access on, closing
 * the window hides Renvor to the system tray instead of quitting (the phone
 * needs this process running), and it can optionally start with Windows,
 * hidden in the tray. Real quit is always the tray menu's "Quit Renvor".
 */
import { app, Menu, Tray, nativeImage } from 'electron'

const HIDDEN_FLAG = '--hidden'

let tray: Tray | null = null
let quitting = false

export function markQuitting(): void {
  quitting = true
}

export function isQuitting(): boolean {
  return quitting
}

export function launchedHidden(): boolean {
  return process.argv.includes(HIDDEN_FLAG)
}

export function ensureTray(opts: { iconPath: string; showWindow: () => void }): void {
  if (tray) return
  const icon = nativeImage.createFromPath(opts.iconPath).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip('Renvor - phone access is on')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Renvor', click: opts.showWindow },
      { type: 'separator' },
      { label: 'Quit Renvor', click: () => app.quit() }
    ])
  )
  tray.on('click', opts.showWindow)
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}

/** Registering the dev electron.exe as a login item would be wrong, so only the installed app can. */
export function getAutostart(): { supported: boolean; enabled: boolean } {
  if (!app.isPackaged) return { supported: false, enabled: false }
  return {
    supported: true,
    enabled: app.getLoginItemSettings({ args: [HIDDEN_FLAG] }).openAtLogin
  }
}

export function setAutostart(enabled: boolean): void {
  if (!app.isPackaged) return
  app.setLoginItemSettings({ openAtLogin: enabled, args: [HIDDEN_FLAG] })
}
