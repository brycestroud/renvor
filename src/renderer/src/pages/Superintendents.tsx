import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { HardHat, Plus, Search } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SuperintendentFormModal, nccerLabels } from '../components/SuperintendentFormModal'
import { gsApi } from '../lib/gsApi'
import type { Superintendent } from '@shared/ipc-contract'

export function Superintendents(): JSX.Element {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: supers, isLoading } = useQuery({
    queryKey: ['superintendents'],
    queryFn: () => gsApi().listSuperintendents()
  })
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => gsApi().listProjects() })
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Superintendent | null | 'new'>(null)
  const [archiving, setArchiving] = useState<Superintendent | null>(null)

  const archive = useMutation({
    mutationFn: (id: string) => gsApi().archiveSuperintendent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superintendents'] })
      setArchiving(null)
    }
  })

  const projectName = (id: string | null) => projects?.find((p) => p.id === id)?.name ?? '—'

  const filtered = (supers ?? []).filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Superintendents"
        actions={
          <button
            onClick={() => setEditing('new')}
            className="flex items-center gap-1.5 rounded-control bg-brand px-3.5 py-2 text-sm font-medium text-[#171200] transition-colors hover:bg-brand-hover"
          >
            <Plus size={16} /> New Superintendent
          </button>
        }
      />

      <div className="relative w-full max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search superintendents…"
          className="w-full rounded-control border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-text-primary outline-none focus:border-info"
        />
      </div>

      {isLoading && <p className="text-sm text-text-muted">Loading…</p>}

      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={HardHat}
          title="No superintendents yet"
          description="Add the supers you'll be walking and scoring each week."
          action={
            <button
              onClick={() => setEditing('new')}
              className="rounded-control bg-brand px-4 py-2 text-sm font-medium text-[#171200] hover:bg-brand-hover"
            >
              Add Superintendent
            </button>
          }
        />
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="hidden overflow-hidden rounded-panel border border-border-subtle md:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-1 text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Home Project</th>
                <th className="px-4 py-3 font-medium">NCCER</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/superintendents/${s.id}`)}
                  className="cursor-pointer border-b border-border-subtle last:border-0 hover:bg-surface-hover"
                >
                  <td className="px-4 py-3 font-medium text-text-primary">{s.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{projectName(s.homeProjectId)}</td>
                  <td className="px-4 py-3 text-text-secondary">{nccerLabels[s.nccerStatus]}</td>
                  <td className="px-4 py-3 text-text-secondary">{s.email || s.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-chip px-2 py-0.5 text-xs ${
                        s.active ? 'bg-success-muted text-success' : 'bg-surface-2 text-text-muted'
                      }`}
                    >
                      {s.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setEditing(s)}
                      className="mr-3 text-xs text-info hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setArchiving(s)}
                      className="text-xs text-danger hover:underline"
                    >
                      Archive
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="flex flex-col gap-2 md:hidden">
          {filtered.map((s) => (
            <div
              key={s.id}
              onClick={() => navigate(`/superintendents/${s.id}`)}
              className="flex cursor-pointer flex-col gap-2 rounded-panel border border-border-subtle bg-surface-1 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{s.name}</p>
                  <p className="truncate text-xs text-text-muted">{projectName(s.homeProjectId)}</p>
                </div>
                <span
                  className={`shrink-0 rounded-chip px-2 py-0.5 text-[11px] ${
                    s.active ? 'bg-success-muted text-success' : 'bg-surface-2 text-text-muted'
                  }`}
                >
                  {s.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {(s.email || s.phone) && (
                <p className="truncate text-xs text-text-secondary">{s.email || s.phone}</p>
              )}
              <div className="flex gap-4 border-t border-border-subtle pt-2 text-xs" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setEditing(s)} className="text-info">Edit</button>
                <button onClick={() => setArchiving(s)} className="ml-auto text-danger">Archive</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <SuperintendentFormModal sup={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}

      {archiving && (
        <ConfirmDialog
          title="Archive superintendent?"
          description={`"${archiving.name}" will be archived, not deleted. Their walk history and action items stay intact.`}
          confirmLabel="Archive"
          danger
          pending={archive.isPending}
          onConfirm={() => archive.mutate(archiving.id)}
          onCancel={() => setArchiving(null)}
        />
      )}
    </div>
  )
}
