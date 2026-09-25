import type { ProcoreClient, ProcoreProject, ProcoreDailyLog, ProcoreObservation, ProcoreInspection } from './types'

/** Small deterministic PRNG so the same project/date range always returns the
 *  same-looking mock data instead of different fake numbers on every call. */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

function datesInRange(from: string, to: string): string[] {
  const start = new Date(from)
  const end = new Date(to)
  const dates: string[] = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

const CREW_NAMES = ['J. Alvarez', 'M. Chen', 'D. Okafor', 'R. Patel', 'S. Nguyen', 'T. Reyes']
const OBSERVATION_TYPES = ['Quality', 'Safety', 'Punch List', 'Coordination']
const INSPECTION_NAMES = ['Framing Inspection', 'Electrical Rough-In', 'Fire System Test', 'Final Punch Walk']

/**
 * Realistic-looking fake data, standing in for the real ProcoreClient until
 * Bryce plugs one in (see docs/PROCORE_INTEGRATION.md). Deterministic per
 * projectId + date range so the same walk always sees the same mock numbers.
 */
export class MockProcoreClient implements ProcoreClient {
  async isConnected(): Promise<boolean> {
    return true
  }

  async listProjects(): Promise<ProcoreProject[]> {
    return [
      { id: 'mock-procore-project-1', name: 'Riverside Medical Center' },
      { id: 'mock-procore-project-2', name: 'Tech Ridge Building 3' },
      { id: 'mock-procore-project-3', name: 'Downtown Mixed-Use Phase II' }
    ]
  }

  async listDailyLogs(
    projectId: string,
    opts: { from: string; to: string; userId?: string }
  ): Promise<ProcoreDailyLog[]> {
    const rand = seededRandom(`${projectId}:daily:${opts.userId ?? ''}`)
    return datesInRange(opts.from, opts.to)
      .filter(() => rand() > 0.25) // not every day gets a log, like real jobsites
      .map((date, i) => ({
        id: `mock-log-${projectId}-${i}`,
        date,
        submittedBy: CREW_NAMES[Math.floor(rand() * CREW_NAMES.length)],
        notes: 'Crew on site, weather clear, work proceeding per schedule.',
        photoCount: Math.floor(rand() * 8)
      }))
  }

  async listObservations(
    projectId: string,
    opts: { from: string; to: string; assigneeId?: string }
  ): Promise<ProcoreObservation[]> {
    const rand = seededRandom(`${projectId}:obs:${opts.assigneeId ?? ''}`)
    const count = 3 + Math.floor(rand() * 4)
    const dates = datesInRange(opts.from, opts.to)
    return Array.from({ length: count }, (_, i) => {
      const createdAt = dates[Math.floor(rand() * dates.length)] ?? opts.from
      const isOpen = rand() > 0.4
      return {
        id: `mock-obs-${projectId}-${i}`,
        number: `OBS-${1000 + i}`,
        type: OBSERVATION_TYPES[Math.floor(rand() * OBSERVATION_TYPES.length)],
        status: isOpen ? 'open' : 'closed',
        description: `${OBSERVATION_TYPES[Math.floor(rand() * OBSERVATION_TYPES.length)]} item flagged during routine walk.`,
        assigneeId: opts.assigneeId ?? null,
        assigneeName: opts.assigneeId ? CREW_NAMES[Math.floor(rand() * CREW_NAMES.length)] : null,
        createdAt,
        dueDate: isOpen ? new Date(new Date(createdAt).getTime() + 7 * 86400000).toISOString().slice(0, 10) : null
      }
    })
  }

  async listInspections(projectId: string, opts: { from: string; to: string }): Promise<ProcoreInspection[]> {
    const rand = seededRandom(`${projectId}:insp`)
    const count = 1 + Math.floor(rand() * 3)
    const dates = datesInRange(opts.from, opts.to)
    const statuses = ['passed', 'failed', 'pending'] as const
    return Array.from({ length: count }, (_, i) => ({
      id: `mock-insp-${projectId}-${i}`,
      name: INSPECTION_NAMES[Math.floor(rand() * INSPECTION_NAMES.length)],
      status: statuses[Math.floor(rand() * statuses.length)],
      date: dates[Math.floor(rand() * dates.length)] ?? opts.from,
      inspector: CREW_NAMES[Math.floor(rand() * CREW_NAMES.length)]
    }))
  }
}
