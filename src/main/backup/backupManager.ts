import { mkdirSync, existsSync, readdirSync, statSync, unlinkSync, copyFileSync, rmSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { getRawSqlite, getDbFilePath, closeDb } from '../db/client'
import { getBackupDir } from '@shared/paths'
import { getAllSettings, setManySettings } from '../ipc/settingsRepo'
import type { BackupFileInfo, RestoreResult } from '@shared/ipc-contract'

const MAX_BACKUPS = 30
const BACKUP_PREFIX = 'gs-backup-'

function resolveBackupDir(): string {
  const settings = getAllSettings()
  const dir = settings.backupFolder ?? getBackupDir()
  mkdirSync(dir, { recursive: true })
  if (!settings.backupFolder) setManySettings({ backupFolder: dir })
  return dir
}

function backupFileName(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
  return `${BACKUP_PREFIX}${stamp}.db`
}

function pruneOldBackups(dir: string): void {
  const files = readdirSync(dir)
    .filter((f) => f.startsWith(BACKUP_PREFIX) && f.endsWith('.db'))
    .map((f) => ({ f, mtime: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)

  for (const { f } of files.slice(MAX_BACKUPS)) {
    unlinkSync(join(dir, f))
  }
}

/** Uses better-sqlite3's online backup API, which is safe to call while the DB is open and in WAL mode. */
export async function performBackup(): Promise<BackupFileInfo> {
  const dir = resolveBackupDir()
  const fileName = backupFileName()
  const destPath = join(dir, fileName)

  const sqlite = getRawSqlite()
  await sqlite.backup(destPath)

  pruneOldBackups(dir)
  setManySettings({ lastBackupAt: new Date().toISOString() })

  const stat = statSync(destPath)
  return { fileName, sizeBytes: stat.size, createdAt: new Date(stat.mtimeMs).toISOString() }
}

export function shouldRunDailyBackup(): boolean {
  const { lastBackupAt } = getAllSettings()
  if (!lastBackupAt) return true
  const last = new Date(lastBackupAt).getTime()
  return Date.now() - last > 24 * 60 * 60 * 1000
}

export function listBackups(): BackupFileInfo[] {
  const dir = resolveBackupDir()
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.startsWith(BACKUP_PREFIX) && f.endsWith('.db'))
    .map((f) => {
      const stat = statSync(join(dir, f))
      return { fileName: f, sizeBytes: stat.size, createdAt: new Date(stat.mtimeMs).toISOString() }
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/**
 * Replaces the live DB file with a chosen backup, then relaunches the app -
 * simplest way to guarantee no stale WAL frames or open handles reference
 * the old data. Always takes a fresh safety backup first.
 */
export async function restoreFromBackup(fileName: string): Promise<RestoreResult> {
  const dir = resolveBackupDir()
  const backupPath = join(dir, fileName)
  if (!existsSync(backupPath)) {
    return { success: false, error: 'Backup file not found.' }
  }

  await performBackup()

  const dbPath = getDbFilePath()
  closeDb()

  for (const ext of ['-wal', '-shm']) {
    const p = dbPath + ext
    if (existsSync(p)) rmSync(p)
  }
  copyFileSync(backupPath, dbPath)

  setTimeout(() => {
    app.relaunch()
    app.exit(0)
  }, 300)

  return { success: true, error: null }
}
