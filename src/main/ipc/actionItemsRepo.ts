import { eq, and, or, isNull } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db/client'
import * as schema from '../db/schema'
import type {
  ActionItemDto,
  ActionItemListDto,
  ActionItemEventDto,
  ListOpenActionItemsInput,
  CreateActionItemInput,
  UpdateActionItemInput,
  TransitionActionItemInput,
  GetActionItemEventsInput
} from '@shared/ipc-contract'

function toDto(row: typeof schema.actionItems.$inferSelect): ActionItemDto {
  return {
    id: row.id,
    text: row.text,
    ownerType: row.ownerType,
    superintendentId: row.superintendentId,
    projectId: row.projectId,
    dueDate: row.dueDate,
    priority: row.priority,
    status: row.status,
    source: row.source,
    sourceSummary: row.sourceSummary,
    originWalkId: row.originWalkId,
    includeInReport: row.includeInReport,
    closedAt: row.closedAt,
    createdAt: row.createdAt
  }
}

/** Every open or carried item for this super on this project - reviewed before a walk can submit. */
export function listOpenActionItemsForSuperProject(
  input: ListOpenActionItemsInput
): ActionItemDto[] {
  const db = getDb()
  const rows = db
    .select()
    .from(schema.actionItems)
    .where(
      and(
        eq(schema.actionItems.superintendentId, input.superintendentId),
        eq(schema.actionItems.projectId, input.projectId),
        isNull(schema.actionItems.deletedAt),
        or(eq(schema.actionItems.status, 'open'), eq(schema.actionItems.status, 'carried'))
      )
    )
    .all()
  return rows.map(toDto)
}

/** Every non-deleted action item, joined with project/super names for display. */
export function listAllActionItems(): ActionItemListDto[] {
  const db = getDb()
  const rows = db
    .select()
    .from(schema.actionItems)
    .where(isNull(schema.actionItems.deletedAt))
    .all()
  const supers = db.select().from(schema.superintendents).all()
  const projects = db.select().from(schema.projects).all()
  const supById = new Map(supers.map((s) => [s.id, s.name]))
  const projById = new Map(projects.map((p) => [p.id, p.name]))

  return rows.map((row) => ({
    ...toDto(row),
    superintendentName: row.superintendentId ? (supById.get(row.superintendentId) ?? null) : null,
    projectName: row.projectId ? (projById.get(row.projectId) ?? null) : null
  }))
}

export function updateActionItem(input: UpdateActionItemInput): ActionItemDto {
  const db = getDb()
  const { id, ...rest } = input
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (rest.text !== undefined) patch.text = rest.text.trim()
  if (rest.ownerType !== undefined) patch.ownerType = rest.ownerType
  if (rest.superintendentId !== undefined) patch.superintendentId = rest.superintendentId
  if (rest.projectId !== undefined) patch.projectId = rest.projectId
  if (rest.dueDate !== undefined) patch.dueDate = rest.dueDate
  if (rest.priority !== undefined) patch.priority = rest.priority
  if (rest.includeInReport !== undefined) patch.includeInReport = rest.includeInReport

  db.update(schema.actionItems).set(patch).where(eq(schema.actionItems.id, id)).run()

  db.insert(schema.actionItemEvents)
    .values({
      id: uuid(),
      actionItemId: id,
      event: 'edited',
      walkId: null,
      note: null,
      notified: null,
      createdAt: new Date().toISOString()
    })
    .run()

  return toDto(db.select().from(schema.actionItems).where(eq(schema.actionItems.id, id)).get()!)
}

/** Soft-delete only, per the "Delete (with confirmation)" spec item - reversible, keeps the event trail intact. */
export function deleteActionItem(id: string): void {
  const db = getDb()
  db.update(schema.actionItems)
    .set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(eq(schema.actionItems.id, id))
    .run()
}

export function getActionItemEvents(input: GetActionItemEventsInput): ActionItemEventDto[] {
  const db = getDb()
  const events = db
    .select()
    .from(schema.actionItemEvents)
    .where(eq(schema.actionItemEvents.actionItemId, input.actionItemId))
    .all()
  const people = db.select().from(schema.people).all()
  const peopleById = new Map(people.map((p) => [p.id, p.name]))

  return events
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((e) => {
      const notifiedIds: string[] = e.notified ? JSON.parse(e.notified) : []
      return {
        id: e.id,
        event: e.event,
        walkId: e.walkId,
        note: e.note,
        notifiedNames: notifiedIds.map((pid) => peopleById.get(pid) ?? 'Unknown'),
        createdAt: e.createdAt
      }
    })
}

export function createActionItem(input: CreateActionItemInput): ActionItemDto {
  const db = getDb()
  const now = new Date().toISOString()
  const id = uuid()
  db.insert(schema.actionItems)
    .values({
      id,
      text: input.text.trim(),
      ownerType: input.ownerType,
      superintendentId: input.superintendentId,
      projectId: input.projectId,
      dueDate: input.dueDate,
      priority: input.priority,
      status: 'open',
      source: input.source,
      sourceSummary: input.sourceSummary,
      originWalkId: input.originWalkId,
      includeInReport: true,
      createdAt: now,
      updatedAt: now
    })
    .run()

  db.insert(schema.actionItemEvents)
    .values({
      id: uuid(),
      actionItemId: id,
      event: 'created',
      walkId: input.originWalkId,
      note: null,
      notified: null,
      createdAt: now
    })
    .run()

  return toDto(db.select().from(schema.actionItems).where(eq(schema.actionItems.id, id)).get()!)
}

const eventToStatus: Record<string, typeof schema.actionItems.$inferSelect.status> = {
  closed: 'closed',
  carried: 'carried',
  escalated: 'escalated',
  de_escalated: 'open',
  reopened: 'open'
}

export function transitionActionItem(input: TransitionActionItemInput): ActionItemDto {
  const db = getDb()
  const now = new Date().toISOString()
  const nextStatus = eventToStatus[input.event]

  const patch: Record<string, unknown> = { status: nextStatus, updatedAt: now }
  if (input.event === 'closed') patch.closedAt = now
  if (input.event === 'reopened' || input.event === 'de_escalated') patch.closedAt = null

  db.update(schema.actionItems).set(patch).where(eq(schema.actionItems.id, input.id)).run()

  db.insert(schema.actionItemEvents)
    .values({
      id: uuid(),
      actionItemId: input.id,
      event: input.event,
      walkId: input.walkId,
      note: input.note,
      notified: input.notified.length > 0 ? JSON.stringify(input.notified) : null,
      createdAt: now
    })
    .run()

  return toDto(db.select().from(schema.actionItems).where(eq(schema.actionItems.id, input.id)).get()!)
}
