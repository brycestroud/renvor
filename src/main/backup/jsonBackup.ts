import { dialog } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { getDb } from '../db/client'
import * as schema from '../db/schema'
import { performBackup } from './backupManager'
import type {
  PdfExportResult,
  JsonImportPickResult,
  JsonImportCommitResult
} from '@shared/ipc-contract'

const TABLE_ORDER = [
  'settings',
  'people',
  'projects',
  'categories',
  'superintendents',
  'checklistItems',
  'superCustomFields',
  'walks',
  'walkCategoryNotes',
  'walkItemScores',
  'actionItems',
  'actionItemEvents',
  'reportSnapshots'
] as const

const tableMap = {
  settings: schema.settings,
  people: schema.people,
  projects: schema.projects,
  categories: schema.categories,
  superintendents: schema.superintendents,
  checklistItems: schema.checklistItems,
  superCustomFields: schema.superCustomFields,
  walks: schema.walks,
  walkCategoryNotes: schema.walkCategoryNotes,
  walkItemScores: schema.walkItemScores,
  actionItems: schema.actionItems,
  actionItemEvents: schema.actionItemEvents,
  reportSnapshots: schema.reportSnapshots
}

interface JsonBackupFile {
  version: 1
  exportedAt: string
  tables: Record<string, unknown[]>
}

export async function exportJson(): Promise<PdfExportResult> {
  const db = getDb()
  const tables: Record<string, unknown[]> = {}
  for (const name of TABLE_ORDER) {
    tables[name] = db.select().from(tableMap[name] as never).all()
  }

  const payload: JsonBackupFile = { version: 1, exportedAt: new Date().toISOString(), tables }

  const suggested = `Renvor-Data-Export_${new Date().toISOString().slice(0, 10)}.json`
  const result = await dialog.showSaveDialog({
    title: 'Export to JSON',
    defaultPath: suggested,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (result.canceled || !result.filePath) return { canceled: true, path: null }

  writeFileSync(result.filePath, JSON.stringify(payload, null, 2), 'utf-8')
  return { canceled: false, path: result.filePath }
}

function validateShape(data: unknown): { valid: boolean; error: string | null; counts: Record<string, number> | null } {
  if (typeof data !== 'object' || data === null || !('tables' in data)) {
    return { valid: false, error: 'Not a recognized Renvor export file (missing "tables").', counts: null }
  }
  const tables = (data as { tables: unknown }).tables
  if (typeof tables !== 'object' || tables === null) {
    return { valid: false, error: '"tables" is not an object.', counts: null }
  }
  const counts: Record<string, number> = {}
  for (const name of TABLE_ORDER) {
    const rows = (tables as Record<string, unknown>)[name]
    if (!Array.isArray(rows)) {
      return { valid: false, error: `Missing or invalid "${name}" table in the export file.`, counts: null }
    }
    counts[name] = rows.length
  }
  return { valid: true, error: null, counts }
}

export async function importJsonPick(): Promise<JsonImportPickResult> {
  const result = await dialog.showOpenDialog({
    title: 'Import from JSON',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true, filePath: null, valid: false, error: null, counts: null }
  }
  const filePath = result.filePaths[0]

  try {
    const raw = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(raw)
    const { valid, error, counts } = validateShape(data)
    return { canceled: false, filePath, valid, error, counts }
  } catch (e) {
    return { canceled: false, filePath, valid: false, error: (e as Error).message, counts: null }
  }
}

export async function importJsonCommit(filePath: string): Promise<JsonImportCommitResult> {
  try {
    const raw = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(raw) as JsonBackupFile
    const { valid, error } = validateShape(data)
    if (!valid) return { success: false, error }

    await performBackup()

    const db = getDb()
    db.transaction((tx) => {
      for (const name of [...TABLE_ORDER].reverse()) {
        tx.delete(tableMap[name] as never).run()
      }
      for (const name of TABLE_ORDER) {
        const rows = data.tables[name]
        for (const row of rows) {
          tx.insert(tableMap[name] as never)
            .values(row as never)
            .run()
        }
      }
    })

    return { success: true, error: null }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

