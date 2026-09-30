import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { ClipboardCheck } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { inputClass, selectClass } from '../components/FormField'
import { WalkEditor } from './jobwalk/WalkEditor'
import { gsApi } from '../lib/gsApi'
import type { VisitType } from '@shared/ipc-contract'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function NewWalkPicker({ onStarted }: { onStarted: (walkId: string) => void }): JSX.Element {
  const queryClient = useQueryClient()
  const { data: supers } = useQuery({
    queryKey: ['superintendents'],
    queryFn: () => gsApi().listSuperintendents()
  })
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => gsApi().listProjects() })
  const { data: recentWalks } = useQuery({
    queryKey: ['recent-walks'],
    queryFn: () => gsApi().listRecentWalks()
  })

  const [superintendentId, setSuperintendentId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [date, setDate] = useState(todayIso())
  const [visitType, setVisitType] = useState<VisitType>('home')
  const [visitTypeTouched, setVisitTypeTouched] = useState(false)

  const activeSupers = (supers ?? []).filter((s) => s.active)
  const selectedSuper = activeSupers.find((s) => s.id === superintendentId)

  useEffect(() => {
    if (!selectedSuper) return
    if (!projectId && selectedSuper.homeProjectId) setProjectId(selectedSuper.homeProjectId)
  }, [selectedSuper, projectId])

  useEffect(() => {
    if (visitTypeTouched || !selectedSuper) return
    setVisitType(projectId === selectedSuper.homeProjectId ? 'home' : 'cross_project')
  }, [projectId, selectedSuper, visitTypeTouched])

  const [error, setError] = useState<string | null>(null)

  const start = useMutation({
    mutationFn: () => gsApi().createWalk({ date, superintendentId, projectId, visitType }),
    onSuccess: (walk) => {
      queryClient.invalidateQueries({ queryKey: ['recent-walks'] })
      onStarted(walk.id)
    },
    onError: (e: Error) => setError(e.message)
  })

  const canStart = Boolean(superintendentId && projectId && date)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Job Walk" />

      <div className="rounded-panel border border-border-subtle bg-surface-1 p-5">
        <h2 className="text-sm font-semibold text-text-primary">Start a walk</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Superintendent</span>
            <select
              className={selectClass}
              value={superintendentId}
              onChange={(e) => {
                setSuperintendentId(e.target.value)
                setProjectId('')
                setVisitTypeTouched(false)
              }}
            >
              <option value="">Select…</option>
              {activeSupers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Project</span>
            <select
              className={selectClass}
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value)
                setVisitTypeTouched(false)
              }}
            >
              <option value="">Select…</option>
              {projects
                ?.filter((p) => p.status === 'active')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Date</span>
            <input
              type="date"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <div className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Visit type</span>
            <div className="flex gap-2">
              {(['home', 'cross_project'] as const).map((vt) => (
                <button
                  key={vt}
                  type="button"
                  onClick={() => {
                    setVisitType(vt)
                    setVisitTypeTouched(true)
                  }}
                  className={`flex-1 rounded-control border px-2 py-2 text-xs transition-colors ${
                    visitType === vt
                      ? 'border-brand-border bg-brand-muted text-brand'
                      : 'border-border bg-surface-2 text-text-secondary hover:bg-surface-hover'
                  }`}
                >
                  {vt === 'home' ? 'Home' : 'Cross-Project'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setError(null)
            start.mutate()
          }}
          disabled={!canStart || start.isPending}
          className="mt-4 h-12 w-full rounded-control bg-brand px-4 py-2.5 text-sm font-medium text-[#171200] transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50 md:h-auto md:w-auto"
        >
          {start.isPending ? 'Starting…' : 'Start Walk'}
        </button>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Recent walks</h2>
        {(recentWalks?.length ?? 0) === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No walks yet"
            description="Start your first walk above."
          />
        ) : (
          <div className="hidden overflow-hidden rounded-panel border border-border-subtle md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-1 text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Superintendent</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Visit</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentWalks?.map((w) => (
                  <tr
                    key={w.id}
                    onClick={() => onStarted(w.id)}
                    className="cursor-pointer border-b border-border-subtle last:border-0 hover:bg-surface-hover"
                  >
                    <td className="px-4 py-3 font-mono text-text-secondary">{w.date}</td>
                    <td className="px-4 py-3 font-medium text-text-primary">{w.superintendentName}</td>
                    <td className="px-4 py-3 text-text-secondary">{w.projectName}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {w.visitType === 'home' ? 'Home' : 'Cross-Project'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-chip px-2 py-0.5 text-xs ${
                          w.status === 'submitted'
                            ? 'bg-success-muted text-success'
                            : 'bg-warning-muted text-warning'
                        }`}
                      >
                        {w.status === 'submitted' ? 'Submitted' : 'Draft'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(recentWalks?.length ?? 0) > 0 && (
          <div className="flex flex-col gap-2 md:hidden">
            {recentWalks?.map((w) => (
              <button
                key={w.id}
                onClick={() => onStarted(w.id)}
                className="flex items-center justify-between gap-3 rounded-panel border border-border-subtle bg-surface-1 p-3 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{w.superintendentName}</p>
                  <p className="truncate text-xs text-text-muted">
                    {w.projectName} · {w.visitType === 'home' ? 'Home' : 'Cross-Project'}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-text-muted">{w.date}</p>
                </div>
                <span
                  className={`shrink-0 rounded-chip px-2 py-0.5 text-[11px] ${
                    w.status === 'submitted' ? 'bg-success-muted text-success' : 'bg-warning-muted text-warning'
                  }`}
                >
                  {w.status === 'submitted' ? 'Submitted' : 'Draft'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function JobWalk(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()
  const walkFromUrl = searchParams.get('walk')
  const [activeWalkId, setActiveWalkId] = useState<string | null>(walkFromUrl)

  function open(id: string): void {
    setActiveWalkId(id)
    setSearchParams({ walk: id })
  }

  function exit(): void {
    setActiveWalkId(null)
    setSearchParams({})
  }

  if (activeWalkId) {
    return <WalkEditor walkId={activeWalkId} onExit={exit} />
  }

  return <NewWalkPicker onStarted={open} />
}
