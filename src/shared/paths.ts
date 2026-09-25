import { join } from 'path'
import { homedir } from 'os'
import { existsSync, mkdirSync, copyFileSync, readdirSync } from 'fs'

/**
 * Standalone-Node app data dir (used by the MCP server, which runs outside
 * Electron). Must resolve to the exact same folder Electron's
 * app.getPath('userData') produces on Windows (%APPDATA%/<productName>) -
 * productName is pinned to "Renvor" in package.json / electron-builder
 * config so this stays in sync without needing Electron itself.
 */
export function getStandaloneAppDataDir(): string {
  const appData = process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming')
  return join(appData, 'Renvor')
}

/** Pre-rename folder name (the app was called "gs-field-ops" through Phase 10). */
function getLegacyAppDataDir(): string {
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
  return join(homedir(), 'Documents', 'Renvor Backups')
}

/**
 * One-time rename migration: copies the pre-rename gs-field-ops app-data
 * folder (db + WAL sidecar files) into the new Renvor folder, so upgrading
 * doesn't orphan any real data already on disk. Copy, never move or delete
 * - the old folder is left untouched in case anything needs it later.
 * Safe to call on every startup: a no-op once the new folder already has a
 * database file.
 */
export function migrateLegacyAppDataDirIfNeeded(): void {
  const newDir = getStandaloneAppDataDir()
  const newDbPath = join(newDir, dbFileName())
  if (existsSync(newDbPath)) return

  const legacyDir = getLegacyAppDataDir()
  const legacyDbPath = join(legacyDir, dbFileName())
  if (!existsSync(legacyDbPath)) return

  mkdirSync(newDir, { recursive: true })
  for (const entry of readdirSync(legacyDir)) {
    if (!entry.startsWith(dbFileName())) continue // db, db-wal, db-shm only
    copyFileSync(join(legacyDir, entry), join(newDir, entry))
  }
}
