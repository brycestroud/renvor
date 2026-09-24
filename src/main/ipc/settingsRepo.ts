import { eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import * as schema from '../db/schema'
import { settingsSchema, type AppSettings, type SetManySettingsInput } from '@shared/ipc-contract'

export function getAllSettings(): AppSettings {
  const db = getDb()
  const rows = db.select().from(schema.settings).all()
  const raw: Record<string, unknown> = {}
  for (const row of rows) {
    try {
      raw[row.key] = JSON.parse(row.value)
    } catch {
      // corrupt row, skip and let schema default fill it in
    }
  }
  return settingsSchema.parse(raw)
}

export function setManySettings(input: SetManySettingsInput): AppSettings {
  const db = getDb()
  const entries = Object.entries(input) as Array<[string, unknown]>

  db.transaction((txDb) => {
    for (const [key, value] of entries) {
      if (value === undefined) continue
      const json = JSON.stringify(value)
      const existing = txDb.select().from(schema.settings).where(eq(schema.settings.key, key)).get()
      if (existing) {
        txDb.update(schema.settings).set({ value: json }).where(eq(schema.settings.key, key)).run()
      } else {
        txDb.insert(schema.settings).values({ key, value: json }).run()
      }
    }
  })

  return getAllSettings()
}
