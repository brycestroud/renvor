/**
 * Pure scoring, due-date and overdue logic. No I/O, no DB, no Date.now()
 * side effects beyond what's passed in - keeps this unit-testable and lets
 * both the renderer (live preview) and main process (report assembly) share
 * one source of truth.
 */

export type ScoreBand = 'green' | 'yellow' | 'red'

export interface ScoredEntry {
  score: number | null
  isNa: boolean
}

/** Average of scored items only. N/A and unscored are excluded. Null if nothing scored. */
export function categoryScore(entries: ScoredEntry[]): number | null {
  const scored = entries.filter((e): e is { score: number; isNa: boolean } => !e.isNa && e.score != null)
  if (scored.length === 0) return null
  const sum = scored.reduce((acc, e) => acc + e.score, 0)
  return sum / scored.length
}

/** >=4 green, >=3 and <4 yellow, <3 red. Same thresholds apply to individual item scores (1-2 red, 3 yellow, 4-5 green). */
export function scoreBand(score: number): ScoreBand {
  if (score >= 4) return 'green'
  if (score >= 3) return 'yellow'
  return 'red'
}

export interface WeightedCategoryInput {
  categoryId: string
  score: number | null
  weight: number | null
  isGsOnly: boolean
}

/**
 * Weighted overall = Σ(category score × weight) / Σ(weights of scored, non-GS-only categories).
 * GS-only categories never enter the weighted score, regardless of whether they have a weight.
 * Returns null if no weighted category has a score.
 */
export function weightedOverallScore(categories: WeightedCategoryInput[]): number | null {
  const eligible = categories.filter(
    (c) => !c.isGsOnly && c.score != null && c.weight != null
  ) as Array<{ categoryId: string; score: number; weight: number }>
  if (eligible.length === 0) return null
  const weightSum = eligible.reduce((acc, c) => acc + c.weight, 0)
  if (weightSum === 0) return null
  const weightedSum = eligible.reduce((acc, c) => acc + c.score * c.weight, 0)
  return weightedSum / weightSum
}

/** Unweighted average of category scores (super average, matrix average, etc). Null if none scored. */
export function unweightedAverage(scores: Array<number | null>): number | null {
  const scored = scores.filter((s): s is number => s != null)
  if (scored.length === 0) return null
  return scored.reduce((acc, s) => acc + s, 0) / scored.length
}

export type ChecklistFrequency = 'weekly' | 'monthly' | 'once_per_job'

export interface PriorScoreRecord {
  /** ISO date string of the walk this score came from */
  date: string
  /** true if this record represents an actual score or N/A (i.e. the item was addressed) */
  wasScored: boolean
}

/**
 * History-based due logic (the prototype's monthly logic was calendar-only and wrong):
 * - weekly: always due
 * - monthly: due unless this super/project pair already has a score for this item
 *   in the current calendar month (of currentWalkDate)
 * - once_per_job: due until this super/project pair has ever scored this item once
 */
export function isItemDue(
  frequency: ChecklistFrequency,
  priorScores: PriorScoreRecord[],
  currentWalkDate: string
): boolean {
  if (frequency === 'weekly') return true

  const scored = priorScores.filter((p) => p.wasScored)

  if (frequency === 'once_per_job') {
    return scored.length === 0
  }

  // monthly
  const currentMonth = currentWalkDate.slice(0, 7) // YYYY-MM
  const hasThisMonth = scored.some((p) => p.date.slice(0, 7) === currentMonth)
  return !hasThisMonth
}

/** Overdue = due date is before today and status isn't closed. */
export function isActionItemOverdue(
  dueDate: string | null,
  status: 'open' | 'carried' | 'closed' | 'escalated',
  today: string
): boolean {
  if (!dueDate || status === 'closed') return false
  return dueDate < today
}

/**
 * Red-flag rule for weekly reports (spec 5.5): Safety <=2, Schedule <=2, or
 * any category <3. Category name match is case-insensitive since it comes
 * from user-editable Settings data, not a fixed enum.
 */
export function isRedFlagCategory(categoryName: string, average: number): boolean {
  const name = categoryName.toLowerCase()
  if ((name === 'safety' || name === 'schedule') && average <= 2) return true
  return average < 3
}

export interface ActionItemStatsInput {
  createdAt: string
  closedAt: string | null
  dueDate: string | null
  status: 'open' | 'carried' | 'closed' | 'escalated'
}

/** Opened/closed this week (by date, inclusive) and currently-overdue counts, for the weekly report's summary line. */
export function computeActionItemStats(
  items: ActionItemStatsInput[],
  weekStart: string,
  weekEnd: string,
  today: string
): { opened: number; closed: number; overdue: number } {
  const inRange = (iso: string) => iso.slice(0, 10) >= weekStart && iso.slice(0, 10) <= weekEnd
  return {
    opened: items.filter((i) => inRange(i.createdAt)).length,
    closed: items.filter((i) => i.closedAt != null && inRange(i.closedAt)).length,
    overdue: items.filter((i) => isActionItemOverdue(i.dueDate, i.status, today)).length
  }
}
