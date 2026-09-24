import { getDb } from '../db/client'
import * as schema from '../db/schema'
import type { SeedSnapshotCategory } from '@shared/ipc-contract'

export function getSeedSnapshot(): SeedSnapshotCategory[] {
  const db = getDb()
  const categories = db
    .select()
    .from(schema.categories)
    .orderBy(schema.categories.sortOrder)
    .all()
  const items = db
    .select()
    .from(schema.checklistItems)
    .orderBy(schema.checklistItems.sortOrder)
    .all()

  return categories.map((cat) => ({
    id: cat.id,
    key: cat.key,
    name: cat.name,
    weight: cat.weight,
    isGsOnly: cat.isGsOnly,
    sortOrder: cat.sortOrder,
    items: items
      .filter((i) => i.categoryId === cat.id)
      .map((i) => ({ id: i.id, text: i.text, frequency: i.frequency, sortOrder: i.sortOrder }))
  }))
}
