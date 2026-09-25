/**
 * Typed interface only - per the build spec's Section 7, no real Procore
 * client is built yet. This is what a future real client implements; today
 * only MockProcoreClient (mockClient.ts) exists. See
 * docs/PROCORE_INTEGRATION.md for where the real one plugs in.
 */
export interface ProcoreProject {
  id: string
  name: string
}

export interface ProcoreDailyLog {
  id: string
  date: string
  submittedBy: string
  notes: string
  photoCount: number
}

export interface ProcoreObservation {
  id: string
  number: string
  type: string
  status: 'open' | 'closed'
  description: string
  assigneeId: string | null
  assigneeName: string | null
  createdAt: string
  dueDate: string | null
}

export interface ProcoreInspection {
  id: string
  name: string
  status: 'passed' | 'failed' | 'pending'
  date: string
  inspector: string
}

export interface ProcoreClient {
  isConnected(): Promise<boolean>
  listProjects(): Promise<ProcoreProject[]>
  listDailyLogs(projectId: string, opts: { from: string; to: string; userId?: string }): Promise<ProcoreDailyLog[]>
  listObservations(
    projectId: string,
    opts: { from: string; to: string; assigneeId?: string }
  ): Promise<ProcoreObservation[]>
  listInspections(projectId: string, opts: { from: string; to: string }): Promise<ProcoreInspection[]>
}
