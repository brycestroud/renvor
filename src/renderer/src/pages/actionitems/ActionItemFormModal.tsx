import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { FormField, inputClass, selectClass } from '../../components/FormField'
import { gsApi } from '../../lib/gsApi'
import type { ActionItemListDto, CreateActionItemInput } from '@shared/ipc-contract'

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const emptyForm: CreateActionItemInput = {
  text: '',
  ownerType: 'superintendent',
  superintendentId: null,
  projectId: null,
  dueDate: addDays(7),
  priority: 'medium',
  source: 'manual',
  sourceSummary: null,
  originWalkId: null
}

export function ActionItemFormModal({
  item,
  onClose
}: {
  item: ActionItemListDto | null
  onClose: () => void
}): JSX.Element {
  const queryClient = useQueryClient()
  const { data: supers } = useQuery({
    queryKey: ['superintendents'],
    queryFn: () => gsApi().listSuperintendents()
  })
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => gsApi().listProjects() })

  const [form, setForm] = useState<CreateActionItemInput>(
    item
      ? {
          text: item.text,
          ownerType: item.ownerType,
          superintendentId: item.superintendentId,
          projectId: item.projectId,
          dueDate: item.dueDate,
          priority: item.priority,
          source: item.source,
          sourceSummary: item.sourceSummary,
          originWalkId: item.originWalkId
        }
      : emptyForm
  )
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: () =>
      item
        ? gsApi().updateActionItem({
            id: item.id,
            text: form.text,
            ownerType: form.ownerType,
            superintendentId: form.superintendentId,
            projectId: form.projectId,
            dueDate: form.dueDate,
            priority: form.priority
          })
        : gsApi().createActionItem(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-items-all'] })
      queryClient.invalidateQueries({ queryKey: ['open-action-items'] })
      onClose()
    },
    onError: (e: Error) => setError(e.message)
  })

  return (
    <Modal title={item ? 'Edit Action Item' : 'New Action Item'} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          save.mutate()
        }}
      >
        <FormField label="Text">
          <textarea
            className={`${inputClass} min-h-[60px] resize-y`}
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
            required
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Superintendent">
            <select
              className={selectClass}
              value={form.superintendentId ?? ''}
              onChange={(e) => setForm({ ...form, superintendentId: e.target.value || null })}
            >
              <option value="">— None —</option>
              {supers?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Project">
            <select
              className={selectClass}
              value={form.projectId ?? ''}
              onChange={(e) => setForm({ ...form, projectId: e.target.value || null })}
            >
              <option value="">— None —</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField label="Owner">
            <select
              className={selectClass}
              value={form.ownerType}
              onChange={(e) =>
                setForm({ ...form, ownerType: e.target.value as CreateActionItemInput['ownerType'] })
              }
            >
              <option value="superintendent">Superintendent</option>
              <option value="gs">GS</option>
              <option value="pm">PM</option>
            </select>
          </FormField>
          <FormField label="Due date">
            <input
              type="date"
              className={inputClass}
              value={form.dueDate ?? ''}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value || null })}
            />
          </FormField>
          <FormField label="Priority">
            <select
              className={selectClass}
              value={form.priority}
              onChange={(e) =>
                setForm({ ...form, priority: e.target.value as CreateActionItemInput['priority'] })
              }
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </FormField>
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
            disabled={save.isPending || !form.text.trim()}
            className="rounded-control bg-brand px-4 py-2 text-sm font-medium text-[#171200] transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : item ? 'Save changes' : 'Add item'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
