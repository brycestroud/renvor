import { eq, and, ne, desc, isNull } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db/client'
import * as schema from '../db/schema'
import type {
  CreateWalkInput,
  UpdateWalkHeaderInput,
  SetItemScoreInput,
  MarkAllRemainingNaInput,
  SetCategoryNoteInput,
  CopyFromLastWalkInput,
  GetItemHistoryInput,
  ItemHistoryRecord,
  SubmitWalkInput,
  WalkListItem,
  WalkDetail
} from '@shared/ipc-contract'

function loadWalkDetail(db: ReturnType<typeof getDb>, id: string): WalkDetail {
  const walk = db.select().from(schema.walks).where(eq(schema.walks.id, id)).get()!
  const sup = db
    .select()
    .from(schema.superintendents)
    .where(eq(schema.superintendents.id, walk.superintendentId))
    .get()
  const project = db.select().from(schema.projects).where(eq(schema.projects.id, walk.projectId)).get()

  const scoreRows = db
    .select()
    .from(schema.walkItemScores)
    .where(eq(schema.walkItemScores.walkId, id))
    .all()
  const items = db.select().from(schema.checklistItems).all()
  const itemById = new Map(items.map((i) => [i.id, i]))

  const noteRows = db
    .select()
    .from(schema.walkCategoryNotes)
    .where(eq(schema.walkCategoryNotes.walkId, id))
    .all()

  return {
    id: walk.id,
    date: walk.date,
    superintendentId: walk.superintendentId,
    superintendentName: sup?.name ?? 'Unknown',
    projectId: walk.projectId,
    projectName: project?.name ?? 'Unknown',
    pmNameSnapshot: walk.pmNameSnapshot,
    visitType: walk.visitType,
    overallNotes: walk.overallNotes,
    followupNotes: walk.followupNotes,
    status: walk.status,
    submittedAt: walk.submittedAt,
    lastEditedAt: walk.lastEditedAt,
    createdAt: walk.createdAt,
    updatedAt: walk.updatedAt,
    itemScores: scoreRows.map((r) => ({
      id: r.id,
      checklistItemId: r.checklistItemId,
      categoryId: itemById.get(r.checklistItemId)?.categoryId ?? '',
      itemTextSnapshot: r.itemTextSnapshot,
      score: r.score,
      isNa: r.isNa
    })),
    categoryNotes: noteRows.map((r) => ({ categoryId: r.categoryId, notes: r.notes ?? '' }))
  }
}

function touchIfSubmitted(db: ReturnType<typeof getDb>, walkId: string): void {
  const walk = db.select().from(schema.walks).where(eq(schema.walks.id, walkId)).get()
  if (walk?.status === 'submitted') {
    db.update(schema.walks)
      .set({ lastEditedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(schema.walks.id, walkId))
      .run()
  } else {
    db.update(schema.walks)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(schema.walks.id, walkId))
      .run()
  }
}

export function listRecentWalks(limit = 25): WalkListItem[] {
  const db = getDb()
  const walks = db
    .select()
    .from(schema.walks)
    .where(isNull(schema.walks.deletedAt))
    .orderBy(desc(schema.walks.date), desc(schema.walks.updatedAt))
    .limit(limit)
    .all()
  const supers = db.select().from(schema.superintendents).all()
  const projects = db.select().from(schema.projects).all()
  const supById = new Map(supers.map((s) => [s.id, s.name]))
  const projById = new Map(projects.map((p) => [p.id, p.name]))

  return walks.map((w) => ({
    id: w.id,
    date: w.date,
    superintendentId: w.superintendentId,
    superintendentName: supById.get(w.superintendentId) ?? 'Unknown',
    projectId: w.projectId,
    projectName: projById.get(w.projectId) ?? 'Unknown',
    visitType: w.visitType,
    status: w.status,
    submittedAt: w.submittedAt,
    updatedAt: w.updatedAt
  }))
}

export function getWalk(id: string): WalkDetail {
  return loadWalkDetail(getDb(), id)
}

export function createWalk(input: CreateWalkInput): WalkDetail {
  const db = getDb()
  const now = new Date().toISOString()
  const id = uuid()
  const project = db.select().from(schema.projects).where(eq(schema.projects.id, input.projectId)).get()

  db.insert(schema.walks)
    .values({
      id,
      date: input.date,
      superintendentId: input.superintendentId,
      projectId: input.projectId,
      pmNameSnapshot: project?.pmName ?? null,
      visitType: input.visitType,
      status: 'draft',
      createdAt: now,
      updatedAt: now
    })
    .run()

  return loadWalkDetail(db, id)
}

export function updateWalkHeader(input: UpdateWalkHeaderInput): WalkDetail {
  const db = getDb()
  const { id, ...rest } = input
  const patch: Record<string, unknown> = {}
  if (rest.date !== undefined) patch.date = rest.date
  if (rest.superintendentId !== undefined) patch.superintendentId = rest.superintendentId
  if (rest.projectId !== undefined) {
    patch.projectId = rest.projectId
    const project = db.select().from(schema.projects).where(eq(schema.projects.id, rest.projectId)).get()
    patch.pmNameSnapshot = project?.pmName ?? null
  }
  if (rest.visitType !== undefined) patch.visitType = rest.visitType
  if (rest.overallNotes !== undefined) patch.overallNotes = rest.overallNotes
  if (rest.followupNotes !== undefined) patch.followupNotes = rest.followupNotes

  const walk = db.select().from(schema.walks).where(eq(schema.walks.id, id)).get()
  patch.updatedAt = new Date().toISOString()
  if (walk?.status === 'submitted') patch.lastEditedAt = new Date().toISOString()

  db.update(schema.walks).set(patch).where(eq(schema.walks.id, id)).run()
  return loadWalkDetail(db, id)
}

export function setItemScore(input: SetItemScoreInput): void {
  const db = getDb()
  const now = new Date().toISOString()
  const item = db
    .select()
    .from(schema.checklistItems)
    .where(eq(schema.checklistItems.id, input.checklistItemId))
    .get()

  const existing = db
    .select()
    .from(schema.walkItemScores)
    .where(
      and(
        eq(schema.walkItemScores.walkId, input.walkId),
        eq(schema.walkItemScores.checklistItemId, input.checklistItemId)
      )
    )
    .get()

  if (existing) {
    db.update(schema.walkItemScores)
      .set({ score: input.score, isNa: input.isNa, updatedAt: now })
      .where(eq(schema.walkItemScores.id, existing.id))
      .run()
  } else {
    db.insert(schema.walkItemScores)
      .values({
        id: uuid(),
        walkId: input.walkId,
        checklistItemId: input.checklistItemId,
        itemTextSnapshot: item?.text ?? '',
        score: input.score,
        isNa: input.isNa,
        createdAt: now,
        updatedAt: now
      })
      .run()
  }
  touchIfSubmitted(db, input.walkId)
}

export function markAllRemainingNa(input: MarkAllRemainingNaInput): void {
  const db = getDb()
  const now = new Date().toISOString()
  const activeItems = db
    .select()
    .from(schema.checklistItems)
    .where(eq(schema.checklistItems.active, true))
    .all()
  const existingScores = db
    .select()
    .from(schema.walkItemScores)
    .where(eq(schema.walkItemScores.walkId, input.walkId))
    .all()
  const scoredIds = new Set(
    existingScores.filter((s) => s.score != null || s.isNa).map((s) => s.checklistItemId)
  )
  const existingByItem = new Map(existingScores.map((s) => [s.checklistItemId, s]))

  db.transaction((tx) => {
    for (const item of activeItems) {
      if (scoredIds.has(item.id)) continue
      const existing = existingByItem.get(item.id)
      if (existing) {
        tx.update(schema.walkItemScores)
          .set({ isNa: true, score: null, updatedAt: now })
          .where(eq(schema.walkItemScores.id, existing.id))
          .run()
      } else {
        tx.insert(schema.walkItemScores)
          .values({
            id: uuid(),
            walkId: input.walkId,
            checklistItemId: item.id,
            itemTextSnapshot: item.text,
            score: null,
            isNa: true,
            createdAt: now,
            updatedAt: now
          })
          .run()
      }
    }
  })
  touchIfSubmitted(db, input.walkId)
}

export function setCategoryNote(input: SetCategoryNoteInput): void {
  const db = getDb()
  const now = new Date().toISOString()
  const existing = db
    .select()
    .from(schema.walkCategoryNotes)
    .where(
      and(
        eq(schema.walkCategoryNotes.walkId, input.walkId),
        eq(schema.walkCategoryNotes.categoryId, input.categoryId)
      )
    )
    .get()

  if (existing) {
    db.update(schema.walkCategoryNotes)
      .set({ notes: input.notes, updatedAt: now })
      .where(eq(schema.walkCategoryNotes.id, existing.id))
      .run()
  } else {
    db.insert(schema.walkCategoryNotes)
      .values({
        id: uuid(),
        walkId: input.walkId,
        categoryId: input.categoryId,
        notes: input.notes,
        createdAt: now,
        updatedAt: now
      })
      .run()
  }
  touchIfSubmitted(db, input.walkId)
}

export function copyFromLastWalk(input: CopyFromLastWalkInput): WalkDetail {
  const db = getDb()
  const current = db.select().from(schema.walks).where(eq(schema.walks.id, input.walkId)).get()!

  const lastWalk = db
    .select()
    .from(schema.walks)
    .where(
      and(
        eq(schema.walks.superintendentId, current.superintendentId),
        ne(schema.walks.id, current.id),
        isNull(schema.walks.deletedAt)
      )
    )
    .orderBy(desc(schema.walks.date), desc(schema.walks.createdAt))
    .limit(1)
    .get()

  if (!lastWalk) return loadWalkDetail(db, current.id)

  const lastScores = db
    .select()
    .from(schema.walkItemScores)
    .where(eq(schema.walkItemScores.walkId, lastWalk.id))
    .all()

  const now = new Date().toISOString()
  db.transaction((tx) => {
    for (const s of lastScores) {
      const existing = tx
        .select()
        .from(schema.walkItemScores)
        .where(
          and(
            eq(schema.walkItemScores.walkId, current.id),
            eq(schema.walkItemScores.checklistItemId, s.checklistItemId)
          )
        )
        .get()
      if (existing) {
        tx.update(schema.walkItemScores)
          .set({ score: s.score, isNa: s.isNa, updatedAt: now })
          .where(eq(schema.walkItemScores.id, existing.id))
          .run()
      } else {
        tx.insert(schema.walkItemScores)
          .values({
            id: uuid(),
            walkId: current.id,
            checklistItemId: s.checklistItemId,
            itemTextSnapshot: s.itemTextSnapshot,
            score: s.score,
            isNa: s.isNa,
            createdAt: now,
            updatedAt: now
          })
          .run()
      }
    }
  })
  touchIfSubmitted(db, current.id)
  return loadWalkDetail(db, current.id)
}

export function getItemHistory(input: GetItemHistoryInput): ItemHistoryRecord[] {
  const db = getDb()
  const walks = db
    .select()
    .from(schema.walks)
    .where(
      and(
        eq(schema.walks.superintendentId, input.superintendentId),
        eq(schema.walks.projectId, input.projectId),
        isNull(schema.walks.deletedAt)
      )
    )
    .all()
    .filter((w) => w.id !== input.excludeWalkId)

  if (walks.length === 0) return []
  const walkDateById = new Map(walks.map((w) => [w.id, w.date]))
  const walkIds = new Set(walks.map((w) => w.id))

  const scores = db.select().from(schema.walkItemScores).all()
  return scores
    .filter((s) => walkIds.has(s.walkId) && (s.score != null || s.isNa))
    .map((s) => ({
      checklistItemId: s.checklistItemId,
      date: walkDateById.get(s.walkId)!,
      wasScored: true
    }))
}

export function submitWalk(input: SubmitWalkInput): WalkDetail {
  const db = getDb()
  const now = new Date().toISOString()
  const walk = db.select().from(schema.walks).where(eq(schema.walks.id, input.id)).get()!
  db.update(schema.walks)
    .set({
      status: 'submitted',
      submittedAt: walk.submittedAt ?? now,
      updatedAt: now
    })
    .where(eq(schema.walks.id, input.id))
    .run()
  return loadWalkDetail(db, input.id)
}

/** Soft-delete only - item scores, category notes, and any linked action items stay intact. */
export function archiveWalk(id: string): void {
  const db = getDb()
  db.update(schema.walks)
    .set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(eq(schema.walks.id, id))
    .run()
}
