import { app } from 'electron'
import { existsSync, copyFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { getDb, getDbFilePath } from './client'
import { seedIfEmpty } from './seed'

function backupBeforeMigrate(): void {
  const dbPath = getDbFilePath()
  if (!existsSync(dbPath)) return
  const backupDir = join(app.getPath('userData'), 'pre-migration-backups')
  mkdirSync(backupDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  copyFileSync(dbPath, join(backupDir, `pre-migrate-${stamp}.db`))
}

export function runMigrations(): void {
  backupBeforeMigrate()
  const db = getDb()
  migrate(db, { migrationsFolder: join(__dirname, '../../drizzle') })
  seedIfEmpty(db)
}
