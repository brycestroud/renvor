import { eq } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db/client'
import * as schema from '../db/schema'
import type { CreatePersonInput, Person, UpdatePersonInput } from '@shared/ipc-contract'

export function listPeople(): Person[] {
  const db = getDb()
  return db.select().from(schema.people).orderBy(schema.people.name).all()
}

export function createPerson(input: CreatePersonInput): Person {
  const db = getDb()
  const now = new Date().toISOString()
  const id = uuid()
  db.insert(schema.people)
    .values({
      id,
      name: input.name.trim(),
      title: input.title?.trim() || null,
      email: input.email.trim(),
      role: input.role,
      receivesFullReport: input.receivesFullReport,
      receivesExecSummary: input.receivesExecSummary,
      createdAt: now,
      updatedAt: now
    })
    .run()
  return db.select().from(schema.people).where(eq(schema.people.id, id)).get()!
}

export function updatePerson(input: UpdatePersonInput): Person {
  const db = getDb()
  const { id, ...rest } = input
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (rest.name !== undefined) patch.name = rest.name.trim()
  if (rest.title !== undefined) patch.title = rest.title?.trim() || null
  if (rest.email !== undefined) patch.email = rest.email.trim()
  if (rest.role !== undefined) patch.role = rest.role
  if (rest.receivesFullReport !== undefined) patch.receivesFullReport = rest.receivesFullReport
  if (rest.receivesExecSummary !== undefined) patch.receivesExecSummary = rest.receivesExecSummary

  db.update(schema.people).set(patch).where(eq(schema.people.id, id)).run()
  return db.select().from(schema.people).where(eq(schema.people.id, id)).get()!
}

export function deletePerson(id: string): void {
  const db = getDb()
  db.delete(schema.people).where(eq(schema.people.id, id)).run()
}
