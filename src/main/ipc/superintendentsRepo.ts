import { eq, isNull } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db/client'
import * as schema from '../db/schema'
import type {
  CreateSuperintendentInput,
  Superintendent,
  UpdateSuperintendentInput
} from '@shared/ipc-contract'

function emptyToNull(v: string | null | undefined): string | null {
  if (v == null) return null
  const trimmed = v.trim()
  return trimmed === '' ? null : trimmed
}

// Accepts either the top-level db or a transaction handle from db.transaction() -
// drizzle's transaction type structurally lacks the top-level db's $client
// field, so these internal helpers take the common query-builder surface only.
type Queryable = Pick<ReturnType<typeof getDb>, 'select' | 'insert' | 'update' | 'delete'>

function loadSuperintendent(db: Queryable, id: string): Superintendent {
  const row = db
    .select()
    .from(schema.superintendents)
    .where(eq(schema.superintendents.id, id))
    .get()!
  const customFields = db
    .select()
    .from(schema.superCustomFields)
    .where(eq(schema.superCustomFields.superintendentId, id))
    .orderBy(schema.superCustomFields.sortOrder)
    .all()
  return { ...row, customFields }
}

export function listSuperintendents(): Superintendent[] {
  const db = getDb()
  const rows = db
    .select()
    .from(schema.superintendents)
    .where(isNull(schema.superintendents.deletedAt))
    .orderBy(schema.superintendents.name)
    .all()
  const allCustomFields = db.select().from(schema.superCustomFields).all()
  return rows.map((row) => ({
    ...row,
    customFields: allCustomFields
      .filter((f) => f.superintendentId === row.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }))
}

function syncCustomFields(
  db: Queryable,
  superintendentId: string,
  fields: CreateSuperintendentInput['customFields']
): void {
  const now = new Date().toISOString()
  db.delete(schema.superCustomFields)
    .where(eq(schema.superCustomFields.superintendentId, superintendentId))
    .run()
  fields.forEach((f, index) => {
    db.insert(schema.superCustomFields)
      .values({
        id: uuid(),
        superintendentId,
        label: f.label.trim(),
        value: f.value.trim(),
        sortOrder: f.sortOrder ?? index,
        createdAt: now,
        updatedAt: now
      })
      .run()
  })
}

export function createSuperintendent(input: CreateSuperintendentInput): Superintendent {
  const db = getDb()
  const now = new Date().toISOString()
  const id = uuid()

  db.transaction((tx) => {
    tx.insert(schema.superintendents)
      .values({
        id,
        name: input.name.trim(),
        phone: emptyToNull(input.phone),
        email: emptyToNull(input.email),
        yearsExperience: input.yearsExperience ?? null,
        homeProjectId: input.homeProjectId || null,
        nccerStatus: input.nccerStatus,
        notes: emptyToNull(input.notes),
        active: input.active,
        createdAt: now,
        updatedAt: now
      })
      .run()
    syncCustomFields(tx, id, input.customFields)
  })

  return loadSuperintendent(db, id)
}

export function updateSuperintendent(input: UpdateSuperintendentInput): Superintendent {
  const db = getDb()
  const { id, customFields, ...rest } = input
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (rest.name !== undefined) patch.name = rest.name.trim()
  if (rest.phone !== undefined) patch.phone = emptyToNull(rest.phone)
  if (rest.email !== undefined) patch.email = emptyToNull(rest.email)
  if (rest.yearsExperience !== undefined) patch.yearsExperience = rest.yearsExperience
  if (rest.homeProjectId !== undefined) patch.homeProjectId = rest.homeProjectId || null
  if (rest.nccerStatus !== undefined) patch.nccerStatus = rest.nccerStatus
  if (rest.notes !== undefined) patch.notes = emptyToNull(rest.notes)
  if (rest.active !== undefined) patch.active = rest.active

  db.transaction((tx) => {
    tx.update(schema.superintendents).set(patch).where(eq(schema.superintendents.id, id)).run()
    if (customFields !== undefined) syncCustomFields(tx, id, customFields)
  })

  return loadSuperintendent(db, id)
}

/** Soft-delete only - history (walks, action items) survives. */
export function archiveSuperintendent(id: string): void {
  const db = getDb()
  db.update(schema.superintendents)
    .set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), active: false })
    .where(eq(schema.superintendents.id, id))
    .run()
}
