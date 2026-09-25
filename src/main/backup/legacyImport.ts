/**
 * Importer for the old web prototype's JSON export.
 *
 * IMPORTANT: no real sample of the prototype's export was ever provided
 * (per the Phase 1 answer: "No existing data - start fresh"), so the shape
 * this parses is inferred from the build spec's description, not verified
 * against a real file:
 *
 *   { supers: [...], projects: [...], walks: [...], actions?: [...] }
 *   walk.items: [{ category, text, checked?, na? }]
 *
 * If a real export doesn't match this shape, previewLegacyImport() returns
 * a clear "doesn't match" error rather than guessing further or silently
 * importing garbage - per the build spec's own instruction to ask if the
 * shape doesn't match what's expected.
 */
import { dialog } from 'electron'
import { readFileSync } from 'fs'
import { createHash } from 'crypto'
import { eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import * as schema from '../db/schema'
import { performBackup } from './backupManager'
import type {
  LegacyImportPickResult,
  LegacyImportPreview,
  LegacyImportCommitResult
} from '@shared/ipc-contract'

interface LegacyItem {
  category?: string
  text?: string
  name?: string
  label?: string
  checked?: boolean
  na?: boolean
}

interface LegacyWalk {
  id?: string
  date?: string
  superName?: string
  super?: string
  projectName?: string
  project?: string
  visitType?: string
  items?: LegacyItem[]
  notes?: string
}

interface LegacyProject {
  id?: string
  name?: string
  number?: string
  pmName?: string
  pmEmail?: string
}

interface LegacySuper {
  id?: string
  name?: string
  phone?: string
  email?: string
  homeProject?: string
}

interface LegacyAction {
  text?: string
  owner?: string
  dueDate?: string
  status?: string
  priority?: string
  superName?: string
  projectName?: string
}

interface LegacyExport {
  supers?: LegacySuper[]
  superintendents?: LegacySuper[]
  projects?: LegacyProject[]
  walks?: LegacyWalk[]
  actions?: LegacyAction[]
  actionItems?: LegacyAction[]
}

// Exported for unit testing (src/main/backup/legacyImport.test.ts) - these
// three are pure (no DB access), unlike the rest of this file which needs
// getDb() and so can't run under plain-Node vitest (better-sqlite3 here is
// compiled against Electron's Node ABI - see package.json's postinstall).
export function legacyId(namespace: string, key: string): string {
  const hash = createHash('sha1').update(`${namespace}:${key.toLowerCase().trim()}`).digest('hex')
  return [hash.slice(0, 8), hash.slice(8, 12), hash.slice(12, 16), hash.slice(16, 20), hash.slice(20, 32)].join('-')
}

export function itemText(item: LegacyItem): string {
  return (item.text ?? item.name ?? item.label ?? '').trim()
}

export function parseLegacyFile(raw: string): { data: LegacyExport | null; error: string | null } {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch (e) {
    return { data: null, error: `Not valid JSON: ${(e as Error).message}` }
  }
  if (typeof json !== 'object' || json === null) {
    return { data: null, error: 'File is not a JSON object.' }
  }
  const data = json as LegacyExport
  const supers = data.supers ?? data.superintendents
  const walks = data.walks
  const projects = data.projects
  if (!Array.isArray(supers) || !Array.isArray(walks) || !Array.isArray(projects)) {
    return {
      data: null,
      error:
        'Doesn\'t match the expected prototype export shape (expected top-level "supers", "projects", and "walks" arrays). Tell Bryce the actual structure so the mapping can be adjusted.'
    }
  }
  return { data, error: null }
}

function buildPreview(data: LegacyExport): LegacyImportPreview {
  const db = getDb()
  const existingItems = db.select().from(schema.checklistItems).all()
  const existingByText = new Map(existingItems.map((i) => [i.text.toLowerCase().trim(), i]))

  const uniqueTexts = new Set<string>()
  const warnings: string[] = []
  let matched = 0
  let unmatched = 0

  for (const walk of data.walks ?? []) {
    for (const item of walk.items ?? []) {
      const text = itemText(item)
      if (!text || uniqueTexts.has(text.toLowerCase())) continue
      uniqueTexts.add(text.toLowerCase())
      if (existingByText.has(text.toLowerCase())) {
        matched++
      } else {
        unmatched++
        if (!item.category) {
          warnings.push(`"${text}" has no category and no matching seeded item - it will be skipped.`)
        }
      }
    }
  }

  const supers = data.supers ?? data.superintendents ?? []
  const actions = data.actions ?? data.actionItems ?? []

  return {
    supers: supers.length,
    projects: (data.projects ?? []).length,
    walks: (data.walks ?? []).length,
    actionItems: actions.length,
    matchedChecklistItems: matched,
    unmatchedChecklistItems: unmatched,
    warnings: warnings.slice(0, 20)
  }
}

export async function legacyImportPickAndPreview(): Promise<LegacyImportPickResult> {
  const result = await dialog.showOpenDialog({
    title: 'Import from Legacy Prototype',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true, filePath: null, valid: false, error: null, preview: null }
  }
  const filePath = result.filePaths[0]

  try {
    const raw = readFileSync(filePath, 'utf-8')
    const { data, error } = parseLegacyFile(raw)
    if (!data) return { canceled: false, filePath, valid: false, error, preview: null }
    return { canceled: false, filePath, valid: true, error: null, preview: buildPreview(data) }
  } catch (e) {
    return { canceled: false, filePath, valid: false, error: (e as Error).message, preview: null }
  }
}

export async function legacyImportCommit(filePath: string): Promise<LegacyImportCommitResult> {
  const raw = readFileSync(filePath, 'utf-8')
  const { data, error } = parseLegacyFile(raw)
  if (!data) return { success: false, error, imported: null }

  await performBackup()

  const db = getDb()
  const now = new Date().toISOString()
  const categories = db.select().from(schema.categories).all()
  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase().trim(), c]))

  let importedProjects = 0
  let importedSupers = 0
  let importedWalks = 0
  let importedActions = 0

  db.transaction((tx) => {
    const projectIdByName = new Map<string, string>()
    for (const p of data.projects ?? []) {
      const name = (p.name ?? '').trim()
      if (!name) continue
      const id = p.id ? legacyId('project', p.id) : legacyId('project', name)
      projectIdByName.set(name.toLowerCase(), id)
      const existing = tx.select().from(schema.projects).where(eq(schema.projects.id, id)).get()
      if (!existing) {
        tx.insert(schema.projects)
          .values({
            id,
            name,
            number: p.number ?? null,
            pmName: p.pmName ?? null,
            pmEmail: p.pmEmail ?? null,
            status: 'active',
            createdAt: now,
            updatedAt: now
          })
          .run()
        importedProjects++
      }
    }

    const superIdByName = new Map<string, string>()
    for (const s of data.supers ?? data.superintendents ?? []) {
      const name = (s.name ?? '').trim()
      if (!name) continue
      const id = s.id ? legacyId('super', s.id) : legacyId('super', name)
      superIdByName.set(name.toLowerCase(), id)
      const existing = tx.select().from(schema.superintendents).where(eq(schema.superintendents.id, id)).get()
      if (!existing) {
        const homeProjectId = s.homeProject ? (projectIdByName.get(s.homeProject.toLowerCase()) ?? null) : null
        tx.insert(schema.superintendents)
          .values({
            id,
            name,
            phone: s.phone ?? null,
            email: s.email ?? null,
            homeProjectId,
            nccerStatus: 'not_started',
            active: true,
            createdAt: now,
            updatedAt: now
          })
          .run()
        importedSupers++
      }
    }

    // Old items that don't match a seeded item by text become inactive
    // custom items in their stated category, so historical walks can still
    // reference them without cluttering the active checklist going forward.
    const checklistItemIdByText = new Map(
      tx.select().from(schema.checklistItems).all().map((i) => [i.text.toLowerCase().trim(), i.id])
    )

    function resolveChecklistItemId(item: LegacyItem): string | null {
      const text = itemText(item)
      if (!text) return null
      const existingId = checklistItemIdByText.get(text.toLowerCase())
      if (existingId) return existingId
      if (!item.category) return null
      const category = categoryByName.get(item.category.toLowerCase().trim())
      if (!category) return null

      const id = legacyId('checklistItem', `${category.id}:${text}`)
      const existing = tx.select().from(schema.checklistItems).where(eq(schema.checklistItems.id, id)).get()
      if (!existing) {
        tx.insert(schema.checklistItems)
          .values({
            id,
            categoryId: category.id,
            text,
            frequency: 'weekly',
            isCustom: true,
            sortOrder: 999,
            active: false,
            createdAt: now,
            updatedAt: now
          })
          .run()
      }
      checklistItemIdByText.set(text.toLowerCase(), id)
      return id
    }

    for (const w of data.walks ?? []) {
      const superName = (w.superName ?? w.super ?? '').trim()
      const projectName = (w.projectName ?? w.project ?? '').trim()
      const superintendentId = superIdByName.get(superName.toLowerCase())
      const projectId = projectIdByName.get(projectName.toLowerCase())
      if (!superintendentId || !projectId || !w.date) continue

      const walkId = legacyId('walk', w.id ?? `${superName}|${projectName}|${w.date}`)
      const existing = tx.select().from(schema.walks).where(eq(schema.walks.id, walkId)).get()
      if (existing) continue

      tx.insert(schema.walks)
        .values({
          id: walkId,
          date: w.date,
          superintendentId,
          projectId,
          visitType: w.visitType === 'cross_project' ? 'cross_project' : 'home',
          overallNotes: w.notes ?? null,
          status: 'submitted',
          submittedAt: now,
          createdAt: now,
          updatedAt: now
        })
        .run()
      importedWalks++

      for (const item of w.items ?? []) {
        const checklistItemId = resolveChecklistItemId(item)
        if (!checklistItemId) continue
        if (!item.checked && !item.na) continue // unchecked -> unscored, no row

        tx.insert(schema.walkItemScores)
          .values({
            id: legacyId('walkItemScore', `${walkId}:${checklistItemId}`),
            walkId,
            checklistItemId,
            itemTextSnapshot: itemText(item),
            score: item.checked ? 5 : null,
            isNa: Boolean(item.na),
            createdAt: now,
            updatedAt: now
          })
          .run()
      }
    }

    for (const a of data.actions ?? data.actionItems ?? []) {
      const text = (a.text ?? '').trim()
      if (!text) continue
      const superintendentId = a.superName ? (superIdByName.get(a.superName.toLowerCase()) ?? null) : null
      const projectId = a.projectName ? (projectIdByName.get(a.projectName.toLowerCase()) ?? null) : null
      const id = legacyId('action', `${text}|${a.superName ?? ''}|${a.dueDate ?? ''}`)
      const existing = tx.select().from(schema.actionItems).where(eq(schema.actionItems.id, id)).get()
      if (existing) continue

      tx.insert(schema.actionItems)
        .values({
          id,
          text,
          ownerType: 'gs',
          superintendentId,
          projectId,
          dueDate: a.dueDate ?? null,
          priority: a.priority === 'high' || a.priority === 'low' ? a.priority : 'medium',
          status: a.status === 'closed' ? 'closed' : 'open',
          source: 'manual',
          sourceSummary: 'Imported from legacy prototype export',
          includeInReport: true,
          createdAt: now,
          updatedAt: now
        })
        .run()
      importedActions++
    }
  })

  return {
    success: true,
    error: null,
    imported: {
      supers: importedSupers,
      projects: importedProjects,
      walks: importedWalks,
      actionItems: importedActions
    }
  }
}
