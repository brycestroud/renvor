import { v4 as uuid } from 'uuid'
import type { getDb } from './client'
import * as schema from './schema'
import { CATEGORY_SEED } from '@shared/seedData'

type DB = ReturnType<typeof getDb>

export function seedIfEmpty(db: DB): void {
  const existing = db.select().from(schema.categories).all()
  if (existing.length > 0) return

  const now = new Date().toISOString()

  for (const cat of CATEGORY_SEED) {
    const categoryId = uuid()
    db.insert(schema.categories)
      .values({
        id: categoryId,
        key: cat.key,
        name: cat.name,
        weight: cat.weight ?? null,
        isGsOnly: cat.isGsOnly,
        sortOrder: cat.sortOrder,
        active: true,
        createdAt: now,
        updatedAt: now
      })
      .run()

    cat.items.forEach((itemText, index) => {
      db.insert(schema.checklistItems)
        .values({
          id: uuid(),
          categoryId,
          text: itemText,
          frequency: 'weekly',
          isCustom: false,
          sortOrder: index,
          active: true,
          createdAt: now,
          updatedAt: now
        })
        .run()
    })
  }
}
