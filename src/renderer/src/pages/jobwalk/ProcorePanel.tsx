import { ClipboardList, Eye, ShieldCheck } from 'lucide-react'
import type { ProcoreWalkPanelData } from '@shared/ipc-contract'

const inspectionStatusClass: Record<string, string> = {
  passed: 'text-success',
  failed: 'text-danger',
  pending: 'text-warning'
}

export function ProcorePanel({
  data,
  isLoading,
  projectName,
  superintendentName
}: {
  data: ProcoreWalkPanelData | undefined
  isLoading: boolean
  projectName: string
  superintendentName: string
}): JSX.Element {
  const openObservations = data?.observations.filter((o) => o.status === 'open').length ?? 0
  const closedObservations = data?.observations.filter((o) => o.status === 'closed').length ?? 0

  return (
    <div className="rounded-panel border border-border-subtle bg-surface-1 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Procore this week</h3>
        <span className="rounded-control border border-border-subtle bg-surface-2 px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-disabled">
          Mock data preview
        </span>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        {projectName} · {superintendentName}
      </p>

      {isLoading && <p className="mt-3 text-xs text-text-muted">Loading…</p>}

      {!isLoading && data && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-control border border-border-subtle bg-surface-2 p-3">
            <div className="flex items-center gap-1.5 text-text-secondary">
              <ClipboardList size={14} />
              <span className="text-xs font-medium">Daily Logs</span>
            </div>
            <p className="mt-1 text-lg font-semibold text-text-primary">{data.dailyLogs.length}</p>
            <p className="text-[11px] text-text-muted">submitted this week</p>
          </div>
          <div className="rounded-control border border-border-subtle bg-surface-2 p-3">
            <div className="flex items-center gap-1.5 text-text-secondary">
              <Eye size={14} />
              <span className="text-xs font-medium">Observations</span>
            </div>
            <p className="mt-1 text-lg font-semibold text-text-primary">
              {openObservations} <span className="text-xs font-normal text-text-muted">open</span>
            </p>
            <p className="text-[11px] text-text-muted">{closedObservations} closed this week</p>
          </div>
          <div className="rounded-control border border-border-subtle bg-surface-2 p-3">
            <div className="flex items-center gap-1.5 text-text-secondary">
              <ShieldCheck size={14} />
              <span className="text-xs font-medium">Inspections</span>
            </div>
            <p className="mt-1 text-lg font-semibold text-text-primary">{data.inspections.length}</p>
            <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px]">
              {data.inspections.map((i) => (
                <span key={i.id} className={inspectionStatusClass[i.status]}>
                  {i.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
