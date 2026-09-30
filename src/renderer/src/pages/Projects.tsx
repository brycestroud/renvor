import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Plus, Search } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { FormField, inputClass, selectClass } from '../components/FormField'
import { gsApi } from '../lib/gsApi'
import type { Project, CreateProjectInput } from '@shared/ipc-contract'

const emptyForm: CreateProjectInput = {
  name: '',
  number: null,
  pmName: null,
  pmEmail: null,
  address: null,
  status: 'active',
  procoreProjectId: null,
  procoreCompanyId: null
}

function ProjectFormModal({
  project,
  onClose
}: {
  project: Project | null
  onClose: () => void
}): JSX.Element {
  const queryClient = useQueryClient()
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => gsApi().getSettings() })
  const [form, setForm] = useState<CreateProjectInput>(
    project
      ? {
          name: project.name,
          number: project.number,
          pmName: project.pmName,
          pmEmail: project.pmEmail,
          address: project.address,
          status: project.status,
          procoreProjectId: project.procoreProjectId,
          procoreCompanyId: project.procoreCompanyId
        }
      : emptyForm
  )
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: () =>
      project
        ? gsApi().updateProject({ id: project.id, ...form })
        : gsApi().createProject(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      onClose()
    },
    onError: (e: Error) => setError(e.message)
  })

  return (
    <Modal title={project ? 'Edit Project' : 'New Project'} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          save.mutate()
        }}
      >
        <FormField label="Project name">
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Riverside Medical Center"
            required
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Project number">
            <input
              className={inputClass}
              value={form.number ?? ''}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
              placeholder="2026-014"
            />
          </FormField>
          <FormField label="Status">
            <select
              className={selectClass}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'closed' })}
            >
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="PM name">
            <input
              className={inputClass}
              value={form.pmName ?? ''}
              onChange={(e) => setForm({ ...form, pmName: e.target.value })}
            />
          </FormField>
          <FormField label="PM email">
            <input
              type="email"
              className={inputClass}
              value={form.pmEmail ?? ''}
              onChange={(e) => setForm({ ...form, pmEmail: e.target.value })}
            />
          </FormField>
        </div>
        <FormField label="Address">
          <input
            className={inputClass}
            value={form.address ?? ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </FormField>

        {settings?.procoreEnabled && (
          <div className="grid grid-cols-2 gap-4 rounded-control border border-border-subtle bg-surface-2 p-3">
            <div className="col-span-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Procore (mock preview - not a real connection yet)
            </div>
            <FormField label="Procore project ID">
              <input
                className={inputClass}
                value={form.procoreProjectId ?? ''}
                onChange={(e) => setForm({ ...form, procoreProjectId: e.target.value })}
              />
            </FormField>
            <FormField label="Procore company ID">
              <input
                className={inputClass}
                value={form.procoreCompanyId ?? ''}
                onChange={(e) => setForm({ ...form, procoreCompanyId: e.target.value })}
              />
            </FormField>
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-control border border-border bg-surface-2 px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={save.isPending || !form.name.trim()}
            className="rounded-control bg-brand px-4 py-2 text-sm font-medium text-[#171200] transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : project ? 'Save changes' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function Projects(): JSX.Element {
  const queryClient = useQueryClient()
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => gsApi().listProjects()
  })
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Project | null | 'new'>(null)
  const [archiving, setArchiving] = useState<Project | null>(null)

  const archive = useMutation({
    mutationFn: (id: string) => gsApi().archiveProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setArchiving(null)
    }
  })

  const filtered = (projects ?? []).filter((p) =>
    `${p.name} ${p.number ?? ''} ${p.pmName ?? ''}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Projects"
        actions={
          <button
            onClick={() => setEditing('new')}
            className="flex items-center gap-1.5 rounded-control bg-brand px-3.5 py-2 text-sm font-medium text-[#171200] transition-colors hover:bg-brand-hover"
          >
            <Plus size={16} /> New Project
          </button>
        }
      />

      <div className="relative w-full max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects…"
          className="w-full rounded-control border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-text-primary outline-none focus:border-info"
        />
      </div>

      {isLoading && <p className="text-sm text-text-muted">Loading…</p>}

      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={Building2}
          title="No projects yet"
          description="Add the projects your superintendents work on. You'll assign each super a home project."
          action={
            <button
              onClick={() => setEditing('new')}
              className="rounded-control bg-brand px-4 py-2 text-sm font-medium text-[#171200] hover:bg-brand-hover"
            >
              Add Project
            </button>
          }
        />
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="hidden overflow-hidden rounded-panel border border-border-subtle md:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-1 text-xs uppercase tracking-wide text-text-muted">
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="px-4 py-3 font-medium">PM</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border-subtle last:border-0 hover:bg-surface-hover"
                >
                  <td className="px-4 py-3 font-medium text-text-primary">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-text-secondary">{p.number || '—'}</td>
                  <td className="px-4 py-3 text-text-secondary">{p.pmName || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-chip px-2 py-0.5 text-xs ${
                        p.status === 'active'
                          ? 'bg-success-muted text-success'
                          : 'bg-surface-2 text-text-muted'
                      }`}
                    >
                      {p.status === 'active' ? 'Active' : 'Closed'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing(p)}
                      className="mr-3 text-xs text-info hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setArchiving(p)}
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
          {filtered.map((p) => (
            <div key={p.id} className="flex flex-col gap-2 rounded-panel border border-border-subtle bg-surface-1 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">{p.name}</p>
                  <p className="text-xs text-text-muted">
                    {[p.number, p.pmName && `PM ${p.pmName}`].filter(Boolean).join(' · ') || 'No number or PM'}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-chip px-2 py-0.5 text-[11px] ${
                    p.status === 'active' ? 'bg-success-muted text-success' : 'bg-surface-2 text-text-muted'
                  }`}
                >
                  {p.status === 'active' ? 'Active' : 'Closed'}
                </span>
              </div>
              <div className="flex gap-4 border-t border-border-subtle pt-2 text-xs">
                <button onClick={() => setEditing(p)} className="text-info">Edit</button>
                <button onClick={() => setArchiving(p)} className="ml-auto text-danger">Archive</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ProjectFormModal
          project={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      {archiving && (
        <ConfirmDialog
          title="Archive project?"
          description={`"${archiving.name}" will be archived, not deleted. It drops out of active lists but any walks or action items tied to it stay intact.`}
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
