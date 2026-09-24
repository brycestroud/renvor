import { join } from 'path'
import { homedir } from 'os'

/**
 * Standalone-Node app data dir (used by the MCP server, which runs outside
 * Electron). Must resolve to the exact same folder Electron's
 * app.getPath('userData') produces on Windows (%APPDATA%/<productName>) -
 * productName is pinned to "gs-field-ops" in package.json / electron-builder
 * config so this stays in sync without needing Electron itself.
 */
export function getStandaloneAppDataDir(): string {
  const appData = process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming')
  return join(appData, 'gs-field-ops')
}

export function dbFileName(): string {
  return 'gs-dashboard.db'
}

export function getStandaloneDbFilePath(): string {
  return join(getStandaloneAppDataDir(), dbFileName())
}

export function getBackupDir(): string {
  return join(homedir(), 'Documents', 'GS Dashboard Backups')
}
