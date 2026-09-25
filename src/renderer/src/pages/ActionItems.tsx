import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ListChecks, Plus, Search, History, Download } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { selectClass } from '../components/FormField'
import { ActionItemFormModal } from './actionitems/ActionItemFormModal'
import { HistoryDrawer } from './actionitems/HistoryDrawer'
import { DeEscalateDialog } from './actionitems/DeEscalateDialog'
import { EscalationDialog } from './jobwalk/EscalationDialog'
import { ImportProcoreObservationsDialog } from './actionitems/ImportProcoreObservationsDialog'
import { gsApi } from '../lib/gsApi'
import { isActionItemOverdue } from '@shared/scoring'
import type { ActionItemListDto } from '@shared/ipc-contract'

type StatusFilter = 'open' | 'overdue' | 'escalated' | 'closed' | 'all'

const statusTabs: Array<{ key: StatusFilter; label: string }> = [
  { key: 'open', label: 'Open' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'escalated', label: 'Escalated' },
  { key: 'closed', label: 'Closed' },
  { key: 'all', label: 'All' }
]

const priorityColors: Record<ActionItemListDto['priority'], string> = {
  high: 'text-danger',
  medium: 'text-warning',
  low: 'text-text-muted'
}

const statusChip: Record<ActionItemListDto['status'], string> = {
  open: 'bg-surface-2 text-text-secondary',
  carried: 'bg-warning-muted text-warning',
  escalated: 'bg-danger-muted text-danger',
  closed: 'bg-success-muted text-success'
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function startOfWeekIso(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().slice(0, 10)
}

export function ActionItems(): JSX.Element {
  const queryClient = useQueryClient()
  const { data: items, isLoading } = useQuery({
    queryKey: ['action-items-all'],
    queryFn: () => gsApi().listAllActionItems()
  })
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => gsApi().listProjects() })
  const { data: supers } = useQuery({
    queryKey: ['superintendents'],
    queryFn: () => gsApi().listSuperintendents()
  })
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => gsApi().getSettings() })

  const [status, setStatus] = useState<StatusFilter>('open')
  const [projectId, setProjectId] = useState('')
  const [superintendentId, setSuperintendentId] = useState('')
  const [ownerType, setOwnerType] = useState('')
  const [priority, setPriority] = useState('')
  const [search, setSearch] = useState('')

  const [editing, setEditing] = useState<ActionItemListDto | null | 'new'>(null)
  const [deleting, setDeleting] = useState<ActionItemListDto | null>(null)
  const [escalating, setEscalating] = useState<ActionItemListDto | null>(null)
  const [deEscalating, setDeEscalating] = useState<ActionItemListDto | null>(null)
  const [historyItem, setHistoryItem] = useState<ActionItemListDto | null>(null)
  const [importingProcore, setImportingProcore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = todayIso()

  const transition = useMutation({
    mutationFn: (vars: { id: string; event: 'closed' | 'carried' | 'reopened' }) =>
      gsApi().transitionActionItem({
        id: vars.id,
        event: vars.event,
        note: null,
        notified: [],
        walkId: null
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-items-all'] })
      queryClient.invalidateQueries({ queryKey: ['open-action-items'] })
    },
    onError: (e: Error) => setError(e.message)
  })

  const toggleIncludeInReport = useMutation({
    mutationFn: (vars: { id: string; includeInReport: boolean }) =>
      gsApi().updateActionItem({ id: vars.id, includeInReport: vars.includeInReport }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['action-items-all'] }),
    onError: (e: Error) => setError(e.message)
  })

  const remove = useMutation({
    mutationFn: (id: string) => gsApi().deleteActionItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-items-all'] })
      queryClient.invalidateQueries({ queryKey: ['open-action-items'] })
      setDeleting(null)
    },
    onError: (e: Error) => setError(e.message)
  })

  const stats = useMemo(() => {
    const all = items ?? []
    const weekStart = startOfWeekIso()
    return {
      open: all.filter((i) => i.status === 'open' || i.status === 'carried').length,
      overdue: all.filter((i) => isActionItemOverdue(i.dueDate, i.status, today)).length,
      escalated: all.filter((i) => i.status === 'escalated').length,
      closedThisWeek: all.filter((i) => i.status === 'closed' && i.closedAt && i.closedAt.slice(0, 10) >= weekStart)
        .length
    }
  }, [items, today])

  const filtered = useMemo(() => {
    return (items ?? []).filter((i) => {
      if (status === 'open' && i.status !== 'open' && i.status !== 'carried') return false
      if (status === 'overdue' && !isActionItemOverdue(i.dueDate, i.status, today)) return false
      if (status === 'escalated' && i.status !== 'escalated') return false
      if (status === 'closed' && i.status !== 'closed') return false
      if (projectId && i.projectId !== projectId) return false
      if (superintendentId && i.superintendentId !== superintendentId) return false
      if (ownerType && i.ownerType !== ownerType) return false
      if (priority && i.priority !== priority) return false
      if (search && !i.text.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [items, status, projectId, superintendentId, ownerType, priority, search, today])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Action Items"
        actions={
          <div className="flex gap-2">
            {settings?.procoreEnabled && (
              <button
                onClick={() => setImportingProcore(true)}
                disabled={!projectId}
                title={projectId ? undefined : 'Pick a project filter above first'}
                className="flex items-center gap-1.5 rounded-control border border-border bg-surface-2 px-3.5 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={16} /> Import from Procore
              </button>
            )}
            <button
              onClick={() => setEditing('new')}
              className="flex items-center gap-1.5 rounded-control bg-brand px-3.5 py-2 text-sm font-medium text-[#171200] transition-colors hover:bg-brand-hover"
            >
              <Plus size={16} /> Manual Add
            </button>
          </div>
        }
      />

      {error && (
        <p className="rounded-control border border-danger-muted bg-danger-muted px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-panel border border-border-subtle bg-surface-1 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-text-muted">Open</p>
          <p className="mt-1 font-mono text-2xl text-text-primary">{stats.open}</p>
        </div>
        <div className="rounded-panel border border-border-subtle bg-surface-1 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-text-muted">Overdue</p>
          <p className="mt-1 font-mono text-2xl text-danger">{stats.overdue}</p>
        </div>
        <div className="rounded-panel border border-border-subtle bg-surface-1 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-text-muted">Escalated</p>
          <p className="mt-1 font-mono text-2xl text-danger">{stats.escalated}</p>
        </div>
        <div className="rounded-panel border border-border-subtle bg-surface-1 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-text-muted">Closed this week</p>
          <p className="mt-1 font-mono text-2xl text-success">{stats.closedThisWeek}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatus(tab.key)}
              className={`rounded-control border px-3 py-1.5 text-xs transition-colors ${
                status === tab.key
                  ? 'border-brand-border bg-brand-muted text-brand'
                  : 'border-border bg-surface-2 text-text-secondary hover:bg-surface-hover'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={`${selectClass} w-[170px]`}>
            <option value="">All projects</option>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={superintendentId}
            onChange={(e) => setSuperintendentId(e.target.value)}
            className={`${selectClass} w-[170px]`}
          >
            <option value="">All supers</option>
            {supers?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select value={ownerType} onChange={(e) => setOwnerType(e.target.value)} className={`${selectClass} w-[140px]`}>
            <option value="">All owners</option>
            <option value="gs">GS</option>
            <option value="superintendent">Superintendent</option>
            <option value="pm">PM</option>
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={`${selectClass} w-[130px]`}>
            <option value="">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-control border border-border bg-surface-2 py-2 pl-8 pr-3 text-sm text-text-primary outline-none focus:border-info"
            />
          </div>
        </div>
      </div>

      {isLoading && <p className="text-sm text-text-muted">Loading…</p>}

      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={ListChecks}
          title="No action items match"
          description="Try a different filter, or add one manually."
        />
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="overflow-hidden rounded-panel border border-border-subtle">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-1 text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Project / Super</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const overdue = isActionItemOverdue(item.dueDate, item.status, today)
                return (
                  <tr key={item.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-hover">
                    <td className="max-w-[280px] px-4 py-3">
                      <p className="truncate text-text-primary">{item.text}</p>
                      {item.status === 'escalated' && (
                        <label className="mt-1 flex items-center gap-1.5 text-[11px] text-text-muted">
                          <input
                            type="checkbox"
                            checked={item.includeInReport}
                            onChange={(e) =>
                              toggleIncludeInReport.mutate({ id: item.id, includeInReport: e.target.checked })
                            }
                            className="h-3 w-3 accent-[var(--brand)]"
                          />
                          Include in report
                        </label>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      <div>{item.projectName ?? '—'}</div>
                      <div className="text-xs text-text-muted">{item.superintendentName ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary capitalize">{item.ownerType}</td>
                    <td className={`px-4 py-3 font-mono text-xs ${overdue ? 'text-danger' : 'text-text-secondary'}`}>
                      {item.dueDate ?? '—'}
                      {overdue && ' · overdue'}
                    </td>
                    <td className={`px-4 py-3 text-xs font-semibold uppercase ${priorityColors[item.priority]}`}>
                      {item.priority}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-chip px-2 py-0.5 text-xs capitalize ${statusChip[item.status]}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5 text-xs">
                        {(item.status === 'open' || item.status === 'carried') && (
                          <>
                            <button
                              onClick={() => transition.mutate({ id: item.id, event: 'closed' })}
                              className="rounded-control border border-border bg-surface-2 px-2 py-1 text-text-secondary hover:bg-surface-hover"
                            >
                              Close
                            </button>
                            <button
                              onClick={() => transition.mutate({ id: item.id, event: 'carried' })}
                              className="rounded-control border border-border bg-surface-2 px-2 py-1 text-text-secondary hover:bg-surface-hover"
                            >
                              Carry
                            </button>
                            <button
                              onClick={() => setEscalating(item)}
                              className="rounded-control border border-danger-muted bg-danger-muted px-2 py-1 text-danger hover:brightness-110"
                            >
                              Escalate
                            </button>
                          </>
                        )}
                        {item.status === 'escalated' && (
                          <button
                            onClick={() => setDeEscalating(item)}
                            className="rounded-control border border-border bg-surface-2 px-2 py-1 text-text-secondary hover:bg-surface-hover"
                          >
                            De-escalate
                          </button>
                        )}
                        {item.status === 'closed' && (
                          <button
                            onClick={() => transition.mutate({ id: item.id, event: 'reopened' })}
                            className="rounded-control border border-border bg-surface-2 px-2 py-1 text-text-secondary hover:bg-surface-hover"
                          >
                            Reopen
                          </button>
                        )}
                        <button
                          onClick={() => setHistoryItem(item)}
                          className="rounded-control p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary"
                          title="History"
                        >
                          <History size={14} />
                        </button>
                        <button
                          onClick={() => setEditing(item)}
                          className="rounded-control border border-border bg-surface-2 px-2 py-1 text-text-secondary hover:bg-surface-hover"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleting(item)}
                          className="rounded-control border border-border bg-surface-2 px-2 py-1 text-danger hover:bg-surface-hover"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && <ActionItemFormModal item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}

      {escalating && (
        <EscalationDialog
          item={escalating}
          superintendentName={escalating.superintendentName ?? '—'}
          projectName={escalating.projectName ?? '—'}
          onClose={() => setEscalating(null)}
        />
      )}

      {deEscalating && <DeEscalateDialog item={deEscalating} onClose={() => setDeEscalating(null)} />}

      {historyItem && <HistoryDrawer item={historyItem} onClose={() => setHistoryItem(null)} />}

      {importingProcore && projectId && (
        <ImportProcoreObservationsDialog
          projectId={projectId}
          projectName={projects?.find((p) => p.id === projectId)?.name ?? 'this project'}
          onClose={() => setImportingProcore(false)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete this action item?"
          description={`"${deleting.text}" will be removed from all lists. This can't be undone from the app.`}
          confirmLabel="Delete"
          danger
          pending={remove.isPending}
          onConfirm={() => remove.mutate(deleting.id)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
