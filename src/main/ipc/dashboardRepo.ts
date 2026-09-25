import { eq, and, isNull } from 'drizzle-orm'
import { getDb } from '../db/client'
import * as schema from '../db/schema'
import { categoryScore, unweightedAverage } from '@shared/scoring'
import type { GetMatrixInput, DashboardMatrix, MatrixRow, WalkHistoryEntry } from '@shared/ipc-contract'

function startOfWeekIso(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().slice(0, 10)
}

export function getMatrix(input: GetMatrixInput): DashboardMatrix {
  const db = getDb()

  const supers = db
    .select()
    .from(schema.superintendents)
    .where(and(isNull(schema.superintendents.deletedAt), eq(schema.superintendents.active, true)))
    .all()
  const projects = db.select().from(schema.projects).all()
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]))

  const allSubmittedWalks = db
    .select()
    .from(schema.walks)
    .where(and(isNull(schema.walks.deletedAt), eq(schema.walks.status, 'submitted')))
    .all()

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

  const walksThisWeekCount = allSubmittedWalks.filter((w) => w.date >= startOfWeekIso()).length

  const rows: MatrixRow[] = supers.map((sup) => {
    const allWalksForSuper = allSubmittedWalks.filter((w) => w.superintendentId === sup.id)
    const lastWalkDate =
      allWalksForSuper.length > 0
        ? allWalksForSuper.reduce((max, w) => (w.date > max ? w.date : max), allWalksForSuper[0].date)
        : null

    const walksInRange = allWalksForSuper.filter((w) => w.date >= input.from && w.date <= input.to)

    const categoryScores = categories.map((cat) => {
      const perWalkScores = walksInRange.map((walk) => {
        const scoresForWalk = scoresByWalkId.get(walk.id) ?? []
        const entries = scoresForWalk
          .filter((s) => categoryByChecklistItemId.get(s.checklistItemId) === cat.id)
          .map((s) => ({ score: s.score, isNa: s.isNa }))
        return categoryScore(entries)
      })
      return { categoryId: cat.id, average: unweightedAverage(perWalkScores) }
    })

    return {
      superintendentId: sup.id,
      name: sup.name,
      homeProjectId: sup.homeProjectId,
      homeProjectName: sup.homeProjectId ? (projectNameById.get(sup.homeProjectId) ?? null) : null,
      walksInRange: walksInRange.length,
      lastWalkDate,
      categoryScores
    }
  })

  return { rows, walksThisWeekCount }
}

export function getSuperintendentWalkHistory(superintendentId: string): WalkHistoryEntry[] {
  const db = getDb()

  const walks = db
    .select()
    .from(schema.walks)
    .where(
      and(
        eq(schema.walks.superintendentId, superintendentId),
        eq(schema.walks.status, 'submitted'),
        isNull(schema.walks.deletedAt)
      )
    )
    .all()
  const projects = db.select().from(schema.projects).all()
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]))

  const categories = db.select().from(schema.categories).where(eq(schema.categories.active, true)).all()
  const checklistItems = db.select().from(schema.checklistItems).all()
  const categoryByChecklistItemId = new Map(checklistItems.map((i) => [i.id, i.categoryId]))

  return walks
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((walk) => {
      const scores = db
        .select()
        .from(schema.walkItemScores)
        .where(eq(schema.walkItemScores.walkId, walk.id))
        .all()

      const categoryScores = categories.map((cat) => {
        const entries = scores
          .filter((s) => categoryByChecklistItemId.get(s.checklistItemId) === cat.id)
          .map((s) => ({ score: s.score, isNa: s.isNa }))
        return { categoryId: cat.id, average: categoryScore(entries) }
      })

      return {
        walkId: walk.id,
        date: walk.date,
        projectId: walk.projectId,
        projectName: projectNameById.get(walk.projectId) ?? 'Unknown',
        visitType: walk.visitType,
        status: walk.status,
        categoryScores
      }
    })
}
