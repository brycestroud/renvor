import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { FormField, inputClass, selectClass } from '../../components/FormField'
import { gsApi } from '../../lib/gsApi'
import type { Person, CreatePersonInput } from '@shared/ipc-contract'

const roleLabels: Record<Person['role'], string> = {
  vp_ops: 'VP of Ops',
  executive: 'Executive',
  pm: 'Project Manager',
  other: 'Other'
}

const emptyForm: CreatePersonInput = {
  name: '',
  title: null,
  email: '',
  role: 'other',
  receivesFullReport: false,
  receivesExecSummary: false
}

function PersonFormModal({ person, onClose }: { person: Person | null; onClose: () => void }): JSX.Element {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CreatePersonInput>(
    person
      ? {
          name: person.name,
          title: person.title,
          email: person.email,
          role: person.role,
          receivesFullReport: person.receivesFullReport,
          receivesExecSummary: person.receivesExecSummary
        }
      : emptyForm
  )
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: () =>
      person ? gsApi().updatePerson({ id: person.id, ...form }) : gsApi().createPerson(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] })
      onClose()
    },
    onError: (e: Error) => setError(e.message)
  })

  return (
    <Modal title={person ? 'Edit Person' : 'New Person'} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          save.mutate()
        }}
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Name">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Title">
            <input
              className={inputClass}
              value={form.title ?? ''}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="VP of Operations"
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email">
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Role">
            <select
              className={selectClass}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Person['role'] })}
            >
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="flex flex-col gap-2 rounded-control border border-border-subtle bg-surface-2 px-3 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Receives
          </span>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={form.receivesFullReport}
              onChange={(e) => setForm({ ...form, receivesFullReport: e.target.checked })}
              className="h-4 w-4 accent-[var(--brand)]"
            />
            Full weekly report
          </label>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={form.receivesExecSummary}
              onChange={(e) => setForm({ ...form, receivesExecSummary: e.target.checked })}
              className="h-4 w-4 accent-[var(--brand)]"
            />
            Executive summary
          </label>
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
            disabled={save.isPending || !form.name.trim() || !form.email.trim()}
            className="rounded-control bg-brand px-4 py-2 text-sm font-medium text-[#171200] hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : person ? 'Save changes' : 'Add person'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function PeoplePanel(): JSX.Element {
  const queryClient = useQueryClient()
  const { data: people, isLoading } = useQuery({ queryKey: ['people'], queryFn: () => gsApi().listPeople() })
  const [editing, setEditing] = useState<Person | null | 'new'>(null)
  const [deleting, setDeleting] = useState<Person | null>(null)
  const [error, setError] = useState<string | null>(null)

  const remove = useMutation({
    mutationFn: (id: string) => gsApi().deletePerson(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] })
      setDeleting(null)
    },
    onError: (e: Error) => setError(e.message)
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">People</h2>
          <p className="mt-1 text-xs text-text-muted">
            Report recipients and escalation contacts. Full Report and Executive Summary are
            separate audiences per the weekly report.
          </p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-1.5 rounded-control bg-brand px-3 py-1.5 text-xs font-medium text-[#171200] hover:bg-brand-hover"
        >
          <Plus size={14} /> Add person
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {isLoading && <p className="text-sm text-text-muted">Loading…</p>}

      {!isLoading && (people?.length ?? 0) === 0 && (
        <p className="rounded-control border border-dashed border-border-subtle px-4 py-6 text-center text-sm text-text-muted">
          No one added yet. Add the VP of Ops and any executives who should get reports.
        </p>
      )}

      {!isLoading && (people?.length ?? 0) > 0 && (
        <div className="overflow-hidden rounded-control border border-border-subtle">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-2 text-xs uppercase tracking-wide text-text-muted">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Reports</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {people!.map((p) => (
                <tr key={p.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-hover">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-text-primary">{p.name}</div>
                    <div className="text-xs text-text-muted">{p.email}</div>
                  </td>
                  <td className="px-3 py-2.5 text-text-secondary">{roleLabels[p.role]}</td>
                  <td className="px-3 py-2.5 text-xs text-text-secondary">
                    {[p.receivesFullReport && 'Full', p.receivesExecSummary && 'Exec'].filter(Boolean).join(' + ') || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => setEditing(p)} className="mr-3 text-xs text-info hover:underline">
                      Edit
                    </button>
                    <button onClick={() => setDeleting(p)} className="text-xs text-danger hover:underline">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <PersonFormModal person={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}

      {deleting && (
        <ConfirmDialog
          title="Remove this person?"
          description={`"${deleting.name}" will stop receiving reports and no longer be selectable as an escalation contact.`}
          confirmLabel="Remove"
          danger
          pending={remove.isPending}
          onConfirm={() => remove.mutate(deleting.id)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
