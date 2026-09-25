import { describe, expect, it } from 'vitest'
import { MockProcoreClient } from './mockClient'

const client = new MockProcoreClient()
const range = { from: '2026-01-05', to: '2026-01-11' } // a Mon-Sun week

describe('MockProcoreClient', () => {
  it('reports connected', async () => {
    expect(await client.isConnected()).toBe(true)
  })

  it('lists a stable, non-empty set of Procore projects', async () => {
    const projects = await client.listProjects()
    expect(projects.length).toBeGreaterThan(0)
    projects.forEach((p) => {
      expect(p.id).toBeTruthy()
      expect(p.name).toBeTruthy()
    })
  })

  it('daily logs stay within the requested date range', async () => {
    const logs = await client.listDailyLogs('project-1', range)
    logs.forEach((log) => {
      expect(log.date >= range.from && log.date <= range.to).toBe(true)
      expect(log.submittedBy).toBeTruthy()
      expect(log.photoCount).toBeGreaterThanOrEqual(0)
    })
  })

  it('is deterministic for the same project + range', async () => {
    const a = await client.listDailyLogs('project-1', range)
    const b = await client.listDailyLogs('project-1', range)
    expect(a).toEqual(b)

    const obsA = await client.listObservations('project-1', range)
    const obsB = await client.listObservations('project-1', range)
    expect(obsA).toEqual(obsB)
  })

  it('produces different data for different projects', async () => {
    const a = await client.listDailyLogs('project-1', range)
    const b = await client.listDailyLogs('project-2', range)
    expect(a).not.toEqual(b)
  })

  it('observations have a valid status and an id unique within the list', async () => {
    const observations = await client.listObservations('project-1', range)
    expect(observations.length).toBeGreaterThan(0)
    const ids = new Set(observations.map((o) => o.id))
    expect(ids.size).toBe(observations.length)
    observations.forEach((o) => {
      expect(['open', 'closed']).toContain(o.status)
      if (o.status === 'open') expect(o.dueDate).not.toBeNull()
      if (o.status === 'closed') expect(o.dueDate).toBeNull()
    })
  })

  it('inspections have a valid status', async () => {
    const inspections = await client.listInspections('project-1', range)
    expect(inspections.length).toBeGreaterThan(0)
    inspections.forEach((i) => {
      expect(['passed', 'failed', 'pending']).toContain(i.status)
    })
  })
})
