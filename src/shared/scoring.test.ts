import { describe, it, expect } from 'vitest'
import {
  categoryScore,
  scoreBand,
  weightedOverallScore,
  unweightedAverage,
  isItemDue,
  isActionItemOverdue
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
