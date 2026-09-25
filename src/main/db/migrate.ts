import { existsSync, copyFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { getStandaloneAppDataDir } from '@shared/paths'
import { getDb, getDbFilePath } from './client'
import { seedIfEmpty } from './seed'

function backupBeforeMigrate(): void {
  const dbPath = getDbFilePath()
  if (!existsSync(dbPath)) return
  const backupDir = join(getStandaloneAppDataDir(), 'pre-migration-backups')
  mkdirSync(backupDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  copyFileSync(dbPath, join(backupDir, `pre-migrate-${stamp}.db`))
}

/**
 * migrationsFolder must be resolved by the caller (via its OWN __dirname),
 * not computed in here: this module gets pulled into a shared Rollup chunk
 * under out/main/chunks/ once there's more than one entry point (index.js +
 * mcp.js both import it), which sits one directory deeper than the entry
 * files - a __dirname computed in here would resolve one level too shallow
 * for both entries, not just the new one.
 */
export function runMigrations(migrationsFolder: string): void {
  backupBeforeMigrate()
  const db = getDb()
  migrate(db, { migrationsFolder })
  seedIfEmpty(db)
}
