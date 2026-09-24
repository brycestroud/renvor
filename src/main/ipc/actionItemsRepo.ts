import { eq, and, or, isNull } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db/client'
import * as schema from '../db/schema'
import type {
  ActionItemDto,
  ListOpenActionItemsInput,
  CreateActionItemInput,
  TransitionActionItemInput
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
