import { describe, it, expect } from 'vitest'
import {
  categoryScore,
  scoreBand,
  weightedOverallScore,
  unweightedAverage,
  isItemDue,
  isActionItemOverdue,
  isRedFlagCategory,
  computeActionItemStats
} from './scoring'

describe('categoryScore', () => {
  it('averages only scored, non-NA items', () => {
    expect(
      categoryScore([
        { score: 4, isNa: false },
        { score: 2, isNa: false },
        { score: null, isNa: true },
        { score: null, isNa: false }
      ])
    ).toBe(3)
  })

  it('returns null when nothing scored', () => {
    expect(categoryScore([{ score: null, isNa: false }, { score: null, isNa: true }])).toBeNull()
  })
})

describe('scoreBand', () => {
  it('bands correctly', () => {
    expect(scoreBand(5)).toBe('green')
    expect(scoreBand(4)).toBe('green')
    expect(scoreBand(3.9)).toBe('yellow')
    expect(scoreBand(3)).toBe('yellow')
    expect(scoreBand(2.9)).toBe('red')
    expect(scoreBand(1)).toBe('red')
  })
})

describe('weightedOverallScore', () => {
  it('excludes GS-only categories even if weighted', () => {
    const result = weightedOverallScore([
      { categoryId: 'safety', score: 4, weight: 18, isGsOnly: false },
      { categoryId: 'schedule', score: 3, weight: 18, isGsOnly: false },
      { categoryId: 'near_miss', score: 5, weight: 50, isGsOnly: true }
    ])
    // (4*18 + 3*18) / (18+18) = 3.5
    expect(result).toBe(3.5)
  })

  it('ignores unscored weighted categories in both numerator and denominator', () => {
    const result = weightedOverallScore([
      { categoryId: 'safety', score: 4, weight: 18, isGsOnly: false },
      { categoryId: 'schedule', score: null, weight: 18, isGsOnly: false }
    ])
    expect(result).toBe(4)
  })

  it('returns null if nothing eligible', () => {
    expect(
      weightedOverallScore([{ categoryId: 'near_miss', score: 5, weight: null, isGsOnly: true }])
    ).toBeNull()
  })
})

describe('unweightedAverage', () => {
  it('averages non-null values', () => {
    expect(unweightedAverage([4, 3, null, 5])).toBe(4)
  })
  it('returns null for empty/all-null', () => {
    expect(unweightedAverage([null, null])).toBeNull()
  })
})

describe('isItemDue', () => {
  it('weekly is always due', () => {
    expect(isItemDue('weekly', [], '2026-09-24')).toBe(true)
    expect(isItemDue('weekly', [{ date: '2026-09-20', wasScored: true }], '2026-09-24')).toBe(true)
  })

  it('monthly is due if no score exists this calendar month', () => {
    expect(
      isItemDue('monthly', [{ date: '2026-08-15', wasScored: true }], '2026-09-24')
    ).toBe(true)
    expect(
      isItemDue('monthly', [{ date: '2026-09-03', wasScored: true }], '2026-09-24')
    ).toBe(false)
  })

  it('once_per_job is due until ever scored', () => {
    expect(isItemDue('once_per_job', [], '2026-09-24')).toBe(true)
    expect(
      isItemDue('once_per_job', [{ date: '2025-01-01', wasScored: true }], '2026-09-24')
    ).toBe(false)
  })
})

describe('isActionItemOverdue', () => {
  it('overdue when due date before today and not closed', () => {
    expect(isActionItemOverdue('2026-09-01', 'open', '2026-09-24')).toBe(true)
    expect(isActionItemOverdue('2026-09-01', 'closed', '2026-09-24')).toBe(false)
    expect(isActionItemOverdue('2026-09-30', 'open', '2026-09-24')).toBe(false)
    expect(isActionItemOverdue(null, 'open', '2026-09-24')).toBe(false)
  })
})

describe('isRedFlagCategory', () => {
  it('flags Safety and Schedule at <=2, case-insensitively', () => {
    expect(isRedFlagCategory('Safety', 2)).toBe(true)
    expect(isRedFlagCategory('safety', 2)).toBe(true)
    expect(isRedFlagCategory('SCHEDULE', 2)).toBe(true)
  })

  it('flags any category under 3, including Safety/Schedule between >2 and <3', () => {
    expect(isRedFlagCategory('Quality Control', 2.9)).toBe(true)
    expect(isRedFlagCategory('Safety', 2.9)).toBe(true) // <3 rule still applies above the <=2 threshold
    expect(isRedFlagCategory('Quality Control', 3)).toBe(false)
  })

  it('does not flag a non-Safety/Schedule category at exactly 3 or above', () => {
    expect(isRedFlagCategory('Budget', 3)).toBe(false)
    expect(isRedFlagCategory('Budget', 5)).toBe(false)
  })
})

describe('computeActionItemStats', () => {
  const weekStart = '2026-09-21'
  const weekEnd = '2026-09-27'
  const today = '2026-09-24'

  it('counts items created and closed within the week (inclusive)', () => {
    const items = [
      { createdAt: '2026-09-21T08:00:00.000Z', closedAt: null, dueDate: null, status: 'open' as const },
      { createdAt: '2026-09-27T23:00:00.000Z', closedAt: '2026-09-22T00:00:00.000Z', dueDate: null, status: 'closed' as const },
      { createdAt: '2026-09-20T00:00:00.000Z', closedAt: null, dueDate: null, status: 'open' as const } // before the week - not opened
    ]
    const stats = computeActionItemStats(items, weekStart, weekEnd, today)
    expect(stats.opened).toBe(2)
    expect(stats.closed).toBe(1)
  })

  it('counts overdue using the same rule as isActionItemOverdue', () => {
    const items = [
      { createdAt: '2026-09-21', closedAt: null, dueDate: '2026-09-01', status: 'open' as const },
      { createdAt: '2026-09-21', closedAt: null, dueDate: '2026-09-01', status: 'closed' as const },
      { createdAt: '2026-09-21', closedAt: null, dueDate: '2026-09-30', status: 'open' as const }
    ]
    expect(computeActionItemStats(items, weekStart, weekEnd, today).overdue).toBe(1)
  })
})
