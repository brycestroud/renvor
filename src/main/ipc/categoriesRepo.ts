import { eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import * as schema from '../db/schema'
import type { CategoryWithItems, UpdateCategoryWeightInput } from '@shared/ipc-contract'

export function listCategoriesWithItems(): CategoryWithItems[] {
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
    active: cat.active,
    items: items
      .filter((i) => i.categoryId === cat.id)
      .map((i) => ({
        id: i.id,
        categoryId: i.categoryId,
        text: i.text,
        frequency: i.frequency,
        isCustom: i.isCustom,
        sortOrder: i.sortOrder,
        active: i.active
      }))
  }))
}

export function updateCategoryWeight(input: UpdateCategoryWeightInput): void {
  const db = getDb()
  db.update(schema.categories)
    .set({ weight: input.weight, updatedAt: new Date().toISOString() })
    .where(eq(schema.categories.id, input.id))
    .run()
}
