import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { dbFileName } from '@shared/paths'

let sqlite: Database.Database | null = null
let db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDbFilePath(): string {
  return join(app.getPath('userData'), dbFileName())
}

export function getDb() {
  if (db) return db
  const userDataDir = app.getPath('userData')
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
