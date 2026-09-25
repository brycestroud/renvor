import { mkdirSync } from 'fs'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { getStandaloneAppDataDir, getStandaloneDbFilePath } from '@shared/paths'

let sqlite: Database.Database | null = null
let db: ReturnType<typeof drizzle<typeof schema>> | null = null

// Path resolution goes through @shared/paths (plain Node, no `electron` app
// import) rather than app.getPath('userData'), so this same client works
// unmodified both inside the Electron app and inside the standalone MCP
// server process - one db client, one set of repo functions, both callers.
export function getDbFilePath(): string {
  return getStandaloneDbFilePath()
}

export function getDb() {
  if (db) return db
  const userDataDir = getStandaloneAppDataDir()
  mkdirSync(userDataDir, { recursive: true })

  sqlite = new Database(getDbFilePath())
  // WAL mode lets the MCP server (a separate local process) read/write the
  // same file concurrently with the Electron app.
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  db = drizzle(sqlite, { schema })
  return db
}

export function getRawSqlite(): Database.Database {
  if (!sqlite) getDb()
  return sqlite!
}

export function closeDb(): void {
  sqlite?.close()
  sqlite = null
  db = null
}
