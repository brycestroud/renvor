import { eq } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db/client'
import * as schema from '../db/schema'
import type {
  CreateChecklistItemInput,
  ReorderChecklistItemsInput,
  UpdateChecklistItemInput
} from '@shared/ipc-contract'

export function createChecklistItem(input: CreateChecklistItemInput): void {
  const db = getDb()
  const now = new Date().toISOString()
  const existing = db
    .select()
    .from(schema.checklistItems)
    .where(eq(schema.checklistItems.categoryId, input.categoryId))
    .all()
  const nextSortOrder = existing.length === 0 ? 0 : Math.max(...existing.map((i) => i.sortOrder)) + 1

  db.insert(schema.checklistItems)
    .values({
      id: uuid(),
      categoryId: input.categoryId,
      text: input.text.trim(),
      frequency: input.frequency,
      isCustom: true,
      sortOrder: nextSortOrder,
      active: true,
      createdAt: now,
      updatedAt: now
    })
    .run()
}

/**
 * Text/frequency/active only - never a hard delete. An item that's been
 * scored must stay visible on old walks, so "removing" it means active:false.
 */
export function updateChecklistItem(input: UpdateChecklistItemInput): void {
  const db = getDb()
  const { id, ...rest } = input
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (rest.text !== undefined) patch.text = rest.text.trim()
  if (rest.frequency !== undefined) patch.frequency = rest.frequency
  if (rest.active !== undefined) patch.active = rest.active

  db.update(schema.checklistItems).set(patch).where(eq(schema.checklistItems.id, id)).run()
}

export function reorderChecklistItems(input: ReorderChecklistItemsInput): void {
  const db = getDb()
  const now = new Date().toISOString()
  db.transaction((tx) => {
    input.orderedIds.forEach((id, index) => {
      tx.update(schema.checklistItems)
        .set({ sortOrder: index, updatedAt: now })
        .where(eq(schema.checklistItems.id, id))
        .run()
    })
  })
}
