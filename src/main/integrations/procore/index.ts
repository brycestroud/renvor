import { MockProcoreClient } from './mockClient'
import type { ProcoreClient } from './types'

export type { ProcoreClient, ProcoreProject, ProcoreDailyLog, ProcoreObservation, ProcoreInspection } from './types'

/**
 * Only a mock client exists (Phase 9 is scaffolding only, per the build
 * spec's explicit "don't build the integration yet"). This factory is the
 * one place that decides which client to hand back, so swapping in a real
 * one later is a one-line change here - see docs/PROCORE_INTEGRATION.md.
 */
export function getProcoreClient(): ProcoreClient {
  return new MockProcoreClient()
}
