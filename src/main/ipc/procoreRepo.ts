import { getProcoreClient } from '../integrations/procore'
import { createActionItem } from './actionItemsRepo'
import type {
  GetProcoreWalkPanelDataInput,
  ProcoreWalkPanelData,
  ListProcoreOpenObservationsInput,
  ProcoreObservationDto,
  ImportProcoreObservationsInput,
  ActionItemDto
} from '@shared/ipc-contract'

export async function getProcoreWalkPanelData(input: GetProcoreWalkPanelDataInput): Promise<ProcoreWalkPanelData> {
  const client = getProcoreClient()
  const range = { from: input.from, to: input.to }
  const [dailyLogs, observations, inspections] = await Promise.all([
    client.listDailyLogs(input.projectId, { ...range, userId: input.superintendentId }),
    client.listObservations(input.projectId, { ...range, assigneeId: input.superintendentId }),
    client.listInspections(input.projectId, range)
  ])
  return { dailyLogs, observations, inspections }
}

/** "Open" here means currently open, regardless of when created - looks back
 *  180 days, which comfortably covers anything still open on a real job. */
export async function listProcoreOpenObservations(
  input: ListProcoreOpenObservationsInput
): Promise<ProcoreObservationDto[]> {
  const client = getProcoreClient()
  const to = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10)
  const observations = await client.listObservations(input.projectId, { from, to })
  return observations.filter((o) => o.status === 'open')
}

export async function importProcoreObservations(input: ImportProcoreObservationsInput): Promise<ActionItemDto[]> {
  const client = getProcoreClient()
  const to = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10)
  const observations = await client.listObservations(input.projectId, { from, to })
  const byId = new Map(observations.map((o) => [o.id, o]))

  return input.observationIds
    .map((id) => byId.get(id))
    .filter((o): o is NonNullable<typeof o> => o != null)
    .map((o) =>
      createActionItem({
        text: `[${o.type}] ${o.description}`,
        ownerType: 'superintendent',
        superintendentId: null,
        projectId: input.projectId,
        dueDate: o.dueDate,
        priority: 'medium',
        source: 'procore',
        sourceSummary: `Imported from Procore observation ${o.number}`,
        originWalkId: null
      })
    )
}
