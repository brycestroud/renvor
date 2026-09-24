import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HardHat, Plus, Search, X } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { FormField, inputClass, selectClass } from '../components/FormField'
import { gsApi } from '../lib/gsApi'
import type { Superintendent, CreateSuperintendentInput } from '@shared/ipc-contract'

const nccerLabels: Record<Superintendent['nccerStatus'], string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed'
}

const emptyForm: CreateSuperintendentInput = {
  name: '',
  phone: null,
  email: null,
  yearsExperience: null,
  homeProjectId: null,
  nccerStatus: 'not_started',
  notes: null,
  active: true,
  customFields: []
}

function SuperintendentFormModal({
  sup,
  onClose
}: {
  sup: Superintendent | null
  onClose: () => void
}): JSX.Element {
  const queryClient = useQueryClient()
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => gsApi().listProjects() })
  const [form, setForm] = useState<CreateSuperintendentInput>(
    sup
      ? {
          name: sup.name,
          phone: sup.phone,
          email: sup.email,
          yearsExperience: sup.yearsExperience,
          homeProjectId: sup.homeProjectId,
          nccerStatus: sup.nccerStatus,
          notes: sup.notes,
          active: sup.active,
          customFields: sup.customFields.map((f) => ({ id: f.id, label: f.label, value: f.value, sortOrder: f.sortOrder }))
        }
      : emptyForm
  )
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: () =>
      sup ? gsApi().updateSuperintendent({ id: sup.id, ...form }) : gsApi().createSuperintendent(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superintendents'] })
      onClose()
    },
    onError: (e: Error) => setError(e.message)
  })

  function addCustomField(): void {
    setForm({
      ...form,
      customFields: [...form.customFields, { label: '', value: '', sortOrder: form.customFields.length }]
    })
  }

  function updateCustomField(index: number, patch: Partial<{ label: string; value: string }>): void {
    setForm({
      ...form,
      customFields: form.customFields.map((f, i) => (i === index ? { ...f, ...patch } : f))
    })
  }

  function removeCustomField(index: number): void {
    setForm({ ...form, customFields: form.customFields.filter((_, i) => i !== index) })
  }

  return (
    <Modal title={sup ? 'Edit Superintendent' : 'New Superintendent'} onClose={onClose} width="lg">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          save.mutate()
        }}
      >
        <FormField label="Name">
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Full name"
            required
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Phone">
            <input
              className={inputClass}
              value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </FormField>
          <FormField label="Email">
            <input
              type="email"
              className={inputClass}
              value={form.email ?? ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField label="Years experience">
            <input
              type="number"
              min={0}
              step={0.5}
              className={inputClass}
              value={form.yearsExperience ?? ''}
              onChange={(e) =>
                setForm({ ...form, yearsExperience: e.target.value === '' ? null : Number(e.target.value) })
              }
            />
          </FormField>
          <FormField label="Home project">
            <select
              className={selectClass}
              value={form.homeProjectId ?? ''}
              onChange={(e) => setForm({ ...form, homeProjectId: e.target.value || null })}
            >
              <option value="">— None —</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="NCCER status">
            <select
              className={selectClass}
              value={form.nccerStatus}
              onChange={(e) =>
                setForm({ ...form, nccerStatus: e.target.value as CreateSuperintendentInput['nccerStatus'] })
              }
            >
              {Object.entries(nccerLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="Notes">
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={form.notes ?? ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Development notes, strengths, areas to work on…"
          />
        </FormField>

        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
            className="h-4 w-4 accent-[var(--brand)]"
          />
          Active
        </label>

        <div className="border-t border-border-subtle pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">Custom fields</span>
            <button
              type="button"
              onClick={addCustomField}
              className="flex items-center gap-1 text-xs text-info hover:underline"
            >
              <Plus size={14} /> Add field
            </button>
          </div>
          {form.customFields.length === 0 && (
            <p className="mt-2 text-xs text-text-muted">
              Optional. Track anything not covered above — certifications, equipment assigned, etc.
            </p>
          )}
          <div className="mt-2 flex flex-col gap-2">
            {form.customFields.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={`${inputClass} flex-1`}
                  placeholder="Label"
                  value={f.label}
                  onChange={(e) => updateCustomField(i, { label: e.target.value })}
                />
                <input
                  className={`${inputClass} flex-1`}
                  placeholder="Value"
                  value={f.value}
                  onChange={(e) => updateCustomField(i, { value: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeCustomField(i)}
                  className="rounded-control p-2 text-text-muted hover:bg-surface-hover hover:text-danger"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

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
            {save.isPending ? 'Saving…' : sup ? 'Save changes' : 'Create superintendent'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function Superintendents(): JSX.Element {
  const queryClient = useQueryClient()
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
        <div className="overflow-hidden rounded-panel border border-border-subtle">
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
                  className="border-b border-border-subtle last:border-0 hover:bg-surface-hover"
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
                  <td className="px-4 py-3 text-right">
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
