import { eq, isNull } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db/client'
import * as schema from '../db/schema'
import type { CreateProjectInput, Project, UpdateProjectInput } from '@shared/ipc-contract'

function emptyToNull(v: string | null | undefined): string | null {
  if (v == null) return null
  const trimmed = v.trim()
  return trimmed === '' ? null : trimmed
}

export function listProjects(): Project[] {
  const db = getDb()
  return db
    .select()
    .from(schema.projects)
    .where(isNull(schema.projects.deletedAt))
    .orderBy(schema.projects.name)
    .all()
}

export function createProject(input: CreateProjectInput): Project {
  const db = getDb()
  const now = new Date().toISOString()
  const id = uuid()
  db.insert(schema.projects)
    .values({
      id,
      name: input.name.trim(),
      number: emptyToNull(input.number),
      pmName: emptyToNull(input.pmName),
      pmEmail: emptyToNull(input.pmEmail),
      address: emptyToNull(input.address),
      status: input.status,
      procoreProjectId: emptyToNull(input.procoreProjectId),
      procoreCompanyId: emptyToNull(input.procoreCompanyId),
      createdAt: now,
      updatedAt: now
    })
    .run()
  return db.select().from(schema.projects).where(eq(schema.projects.id, id)).get()!
}

export function updateProject(input: UpdateProjectInput): Project {
  const db = getDb()
  const { id, ...rest } = input
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (rest.name !== undefined) patch.name = rest.name.trim()
  if (rest.number !== undefined) patch.number = emptyToNull(rest.number)
  if (rest.pmName !== undefined) patch.pmName = emptyToNull(rest.pmName)
  if (rest.pmEmail !== undefined) patch.pmEmail = emptyToNull(rest.pmEmail)
  if (rest.address !== undefined) patch.address = emptyToNull(rest.address)
  if (rest.status !== undefined) patch.status = rest.status
  if (rest.procoreProjectId !== undefined) patch.procoreProjectId = emptyToNull(rest.procoreProjectId)
  if (rest.procoreCompanyId !== undefined) patch.procoreCompanyId = emptyToNull(rest.procoreCompanyId)

  db.update(schema.projects).set(patch).where(eq(schema.projects.id, id)).run()
  return db.select().from(schema.projects).where(eq(schema.projects.id, id)).get()!
}

/** Soft-delete only - projects keep history for walks/action items that reference them. */
export function archiveProject(id: string): void {
  const db = getDb()
  db.update(schema.projects)
    .set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(eq(schema.projects.id, id))
    .run()
}
