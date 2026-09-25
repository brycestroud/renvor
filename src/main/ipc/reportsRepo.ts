import { eq, and, isNull } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db/client'
import * as schema from '../db/schema'
import { categoryScore, weightedOverallScore, unweightedAverage } from '@shared/scoring'
import { getAllSettings } from './settingsRepo'
import type {
  WeekNote,
  RedFlag,
  ReportWalkSection,
  ReportSummaryStats,
  ReportEscalatedItem,
  FullReportData,
  ExecSummaryData,
  ReportSnapshotDto
} from '@shared/ipc-contract'

function weekEndFrom(weekStart: string): string {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 6)
  return d.toISOString().slice(0, 10)
}

interface WeekContext {
  weekStart: string
  weekEnd: string
  walks: (typeof schema.walks.$inferSelect)[]
  supers: (typeof schema.superintendents.$inferSelect)[]
  projects: (typeof schema.projects.$inferSelect)[]
  categories: (typeof schema.categories.$inferSelect)[]
  categoryByChecklistItemId: Map<string, string>
  scoresByWalkId: Map<string, (typeof schema.walkItemScores.$inferSelect)[]>
  notesByWalkId: Map<string, (typeof schema.walkCategoryNotes.$inferSelect)[]>
}

function buildWeekContext(weekStart: string): WeekContext {
  const db = getDb()
  const weekEnd = weekEndFrom(weekStart)

  const walks = db
    .select()
    .from(schema.walks)
    .where(
      and(
        eq(schema.walks.status, 'submitted'),
        isNull(schema.walks.deletedAt)
      )
    )
    .all()
    .filter((w) => w.date >= weekStart && w.date <= weekEnd)

  const supers = db
    .select()
    .from(schema.superintendents)
    .where(and(isNull(schema.superintendents.deletedAt), eq(schema.superintendents.active, true)))
    .all()
  const projects = db.select().from(schema.projects).all()
  const categories = db.select().from(schema.categories).where(eq(schema.categories.active, true)).all()
  const checklistItems = db.select().from(schema.checklistItems).all()
  const categoryByChecklistItemId = new Map(checklistItems.map((i) => [i.id, i.categoryId]))

  const allScores = db.select().from(schema.walkItemScores).all()
  const scoresByWalkId = new Map<string, typeof allScores>()
  for (const s of allScores) {
    const list = scoresByWalkId.get(s.walkId) ?? []
    list.push(s)
    scoresByWalkId.set(s.walkId, list)
  }

  const allNotes = db.select().from(schema.walkCategoryNotes).all()
  const notesByWalkId = new Map<string, typeof allNotes>()
  for (const n of allNotes) {
    const list = notesByWalkId.get(n.walkId) ?? []
    list.push(n)
    notesByWalkId.set(n.walkId, list)
  }

  return { weekStart, weekEnd, walks, supers, projects, categories, categoryByChecklistItemId, scoresByWalkId, notesByWalkId }
}

function walkCategoryScores(
  ctx: WeekContext,
  walk: typeof schema.walks.$inferSelect
): Array<{ categoryId: string; categoryName: string; average: number | null }> {
  const scores = ctx.scoresByWalkId.get(walk.id) ?? []
  return ctx.categories.map((cat) => {
    const entries = scores
      .filter((s) => ctx.categoryByChecklistItemId.get(s.checklistItemId) === cat.id)
      .map((s) => ({ score: s.score, isNa: s.isNa }))
    return { categoryId: cat.id, categoryName: cat.name, average: categoryScore(entries) }
  })
}

function buildRedFlags(ctx: WeekContext): RedFlag[] {
  const supById = new Map(ctx.supers.map((s) => [s.id, s.name]))
  const projById = new Map(ctx.projects.map((p) => [p.id, p.name]))
  const flags: RedFlag[] = []

  for (const walk of ctx.walks) {
    const catScores = walkCategoryScores(ctx, walk)
    for (const cs of catScores) {
      if (cs.average == null) continue
      const isSafety = cs.categoryName.toLowerCase() === 'safety'
      const isSchedule = cs.categoryName.toLowerCase() === 'schedule'
      const flagged = (isSafety && cs.average <= 2) || (isSchedule && cs.average <= 2) || cs.average < 3
      if (flagged) {
        flags.push({
          walkId: walk.id,
          superintendentName: supById.get(walk.superintendentId) ?? 'Unknown',
          projectName: projById.get(walk.projectId) ?? 'Unknown',
          categoryName: cs.categoryName,
          score: cs.average
        })
      }
    }
  }
  return flags
}

function buildSummary(ctx: WeekContext): ReportSummaryStats {
  const walkedSuperIds = new Set(ctx.walks.map((w) => w.superintendentId))
  const overallScores = ctx.walks.map((w) => {
    const catScores = walkCategoryScores(ctx, w)
    return weightedOverallScore(
      catScores.map((cs) => ({
        categoryId: cs.categoryId,
        score: cs.average,
        weight: ctx.categories.find((c) => c.id === cs.categoryId)?.weight ?? null,
        isGsOnly: ctx.categories.find((c) => c.id === cs.categoryId)?.isGsOnly ?? false
      }))
    )
  })

  return {
    walksCompleted: ctx.walks.length,
    supersWalked: walkedSuperIds.size,
    totalActiveSupers: ctx.supers.length,
    averageScore: unweightedAverage(overallScores)
  }
}

function buildEscalatedItems(): ReportEscalatedItem[] {
  const db = getDb()
  const items = db
    .select()
    .from(schema.actionItems)
    .where(
      and(
        eq(schema.actionItems.status, 'escalated'),
        eq(schema.actionItems.includeInReport, true),
        isNull(schema.actionItems.deletedAt)
      )
    )
    .all()
  const supers = db.select().from(schema.superintendents).all()
  const projects = db.select().from(schema.projects).all()
  const supById = new Map(supers.map((s) => [s.id, s.name]))
  const projById = new Map(projects.map((p) => [p.id, p.name]))

  return items.map((i) => ({
    id: i.id,
    text: i.text,
    superintendentName: i.superintendentId ? (supById.get(i.superintendentId) ?? null) : null,
    projectName: i.projectId ? (projById.get(i.projectId) ?? null) : null
  }))
}

function buildActionItemStats(weekStart: string, weekEnd: string) {
  const db = getDb()
  const items = db.select().from(schema.actionItems).where(isNull(schema.actionItems.deletedAt)).all()
  const today = new Date().toISOString().slice(0, 10)

  const opened = items.filter((i) => i.createdAt.slice(0, 10) >= weekStart && i.createdAt.slice(0, 10) <= weekEnd).length
  const closed = items.filter(
    (i) => i.closedAt && i.closedAt.slice(0, 10) >= weekStart && i.closedAt.slice(0, 10) <= weekEnd
  ).length
  const overdue = items.filter((i) => i.dueDate && i.status !== 'closed' && i.dueDate < today).length

  return { opened, closed, overdue }
}

export function getWeekNotes(weekStart: string): WeekNote[] {
  const ctx = buildWeekContext(weekStart)
  const supById = new Map(ctx.supers.map((s) => [s.id, s.name]))
  const projById = new Map(ctx.projects.map((p) => [p.id, p.name]))
  const notes: WeekNote[] = []

  for (const walk of ctx.walks) {
    const supName = supById.get(walk.superintendentId) ?? 'Unknown'
    const projName = projById.get(walk.projectId) ?? 'Unknown'

    if (walk.overallNotes?.trim()) {
      notes.push({
        id: `${walk.id}:overall`,
        walkId: walk.id,
        superintendentName: supName,
        projectName: projName,
        source: 'overall',
        categoryName: null,
        text: walk.overallNotes.trim()
      })
    }
    if (walk.followupNotes?.trim()) {
      notes.push({
        id: `${walk.id}:followup`,
        walkId: walk.id,
        superintendentName: supName,
        projectName: projName,
        source: 'followup',
        categoryName: null,
        text: walk.followupNotes.trim()
      })
    }
    const catNotes = ctx.notesByWalkId.get(walk.id) ?? []
    for (const n of catNotes) {
      if (!n.notes?.trim()) continue
      const cat = ctx.categories.find((c) => c.id === n.categoryId)
      notes.push({
        id: `${walk.id}:cat:${n.categoryId}`,
        walkId: walk.id,
        superintendentName: supName,
        projectName: projName,
        source: 'category',
        categoryName: cat?.name ?? 'Unknown',
        text: n.notes.trim()
      })
    }
  }

  return notes
}

export function getFullReportData(weekStart: string): FullReportData {
  const settings = getAllSettings()
  const ctx = buildWeekContext(weekStart)
  const supById = new Map(ctx.supers.map((s) => [s.id, s.name]))
  const projById = new Map(ctx.projects.map((p) => [p.id, p.name]))
  const walkedSuperIds = new Set(ctx.walks.map((w) => w.superintendentId))
  const { opened, closed, overdue } = buildActionItemStats(ctx.weekStart, ctx.weekEnd)

  const walks: ReportWalkSection[] = ctx.walks
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((walk) => {
      const catScores = walkCategoryScores(ctx, walk)
      const overall = weightedOverallScore(
        catScores.map((cs) => ({
          categoryId: cs.categoryId,
          score: cs.average,
          weight: ctx.categories.find((c) => c.id === cs.categoryId)?.weight ?? null,
          isGsOnly: ctx.categories.find((c) => c.id === cs.categoryId)?.isGsOnly ?? false
        }))
      )
      const catNotes = (ctx.notesByWalkId.get(walk.id) ?? [])
        .filter((n) => n.notes?.trim())
        .map((n) => ({
          categoryName: ctx.categories.find((c) => c.id === n.categoryId)?.name ?? 'Unknown',
          notes: n.notes!.trim()
        }))

      return {
        walkId: walk.id,
        date: walk.date,
        superintendentName: supById.get(walk.superintendentId) ?? 'Unknown',
        projectName: projById.get(walk.projectId) ?? 'Unknown',
        visitType: walk.visitType,
        overallScore: overall,
        categoryScores: catScores,
        overallNotes: walk.overallNotes,
        followupNotes: walk.followupNotes,
        categoryNotes: catNotes
      }
    })

  return {
    companyName: settings.companyName,
    preparedBy: settings.gsName,
    weekStart: ctx.weekStart,
    weekEnd: ctx.weekEnd,
    escalatedItems: buildEscalatedItems(),
    summary: buildSummary(ctx),
    redFlags: buildRedFlags(ctx),
    walks,
    actionItemsOpened: opened,
    actionItemsClosed: closed,
    actionItemsOverdue: overdue,
    supersNotWalked: ctx.supers.filter((s) => !walkedSuperIds.has(s.id)).map((s) => s.name)
  }
}

export function getExecSummaryData(weekStart: string, selectedNoteIds: string[]): ExecSummaryData {
  const settings = getAllSettings()
  const ctx = buildWeekContext(weekStart)
  const allNotes = getWeekNotes(weekStart)
  const selectedSet = new Set(selectedNoteIds)

  return {
    companyName: settings.companyName,
    preparedBy: settings.gsName,
    weekStart: ctx.weekStart,
    weekEnd: ctx.weekEnd,
    summary: buildSummary(ctx),
    escalatedItems: buildEscalatedItems(),
    redFlags: buildRedFlags(ctx),
    selectedNotes: allNotes.filter((n) => selectedSet.has(n.id))
  }
}

export function saveReportSnapshot(
  reportType: 'full' | 'executive',
  weekStart: string,
  data: unknown,
  pdfPath: string | null,
  preparedBy: string | null
): void {
  const db = getDb()
  db.insert(schema.reportSnapshots)
    .values({
      id: uuid(),
      reportType,
      weekStart,
      data: JSON.stringify(data),
      pdfPath,
      preparedBy,
      createdAt: new Date().toISOString()
    })
    .run()
}

export function listReportSnapshots(): ReportSnapshotDto[] {
  const db = getDb()
  const rows = db.select().from(schema.reportSnapshots).all()
  return rows
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((r) => ({
      id: r.id,
      reportType: r.reportType,
      weekStart: r.weekStart,
      pdfPath: r.pdfPath,
      preparedBy: r.preparedBy,
      createdAt: r.createdAt
    }))
}

export function getSnapshotPdfPath(id: string): string | null {
  const db = getDb()
  const row = db.select().from(schema.reportSnapshots).where(eq(schema.reportSnapshots.id, id)).get()
  return row?.pdfPath ?? null
}
