import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { Modal } from './Modal'
import { FormField, inputClass, selectClass } from './FormField'
import { gsApi } from '../lib/gsApi'
import type { Superintendent, CreateSuperintendentInput } from '@shared/ipc-contract'

export const nccerLabels: Record<Superintendent['nccerStatus'], string> = {
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
  procoreUserId: null,
  active: true,
  customFields: []
}

export function SuperintendentFormModal({
  sup,
  onClose
}: {
  sup: Superintendent | null
  onClose: () => void
}): JSX.Element {
  const queryClient = useQueryClient()
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => gsApi().listProjects() })
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => gsApi().getSettings() })
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
          procoreUserId: sup.procoreUserId,
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

        {settings?.procoreEnabled && (
          <FormField label="Procore user ID (mock preview - not a real connection yet)">
            <input
              className={inputClass}
              value={form.procoreUserId ?? ''}
              onChange={(e) => setForm({ ...form, procoreUserId: e.target.value })}
            />
          </FormField>
        )}

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
