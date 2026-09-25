import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { gsApi } from '../../lib/gsApi'

export function ImportProcoreObservationsDialog({
  projectId,
  projectName,
  onClose
}: {
  projectId: string
  projectName: string
  onClose: () => void
}): JSX.Element {
  const queryClient = useQueryClient()
  const { data: observations, isLoading } = useQuery({
    queryKey: ['procore-open-observations', projectId],
    queryFn: () => gsApi().listProcoreOpenObservations({ projectId })
  })
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const importSelected = useMutation({
    mutationFn: () => gsApi().importProcoreObservations({ projectId, observationIds: [...selected] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-items-all'] })
      onClose()
    }
  })

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <Modal title="Import from Procore" onClose={onClose} width="lg">
      <p className="text-sm text-text-secondary">
        Open observations for <span className="text-text-primary">{projectName}</span> (mock data preview -
        not a real Procore connection yet).
      </p>

      {isLoading && <p className="mt-4 text-sm text-text-muted">Loading…</p>}

      {!isLoading && (observations?.length ?? 0) === 0 && (
        <p className="mt-4 rounded-control border border-dashed border-border-subtle px-4 py-6 text-center text-sm text-text-muted">
          No open observations for this project.
        </p>
      )}

      {!isLoading && (observations?.length ?? 0) > 0 && (
        <div className="mt-4 flex max-h-[360px] flex-col gap-2 overflow-y-auto">
          {observations!.map((o) => (
            <label
              key={o.id}
              className="flex items-start gap-3 rounded-control border border-border-subtle bg-surface-2 px-3 py-2.5"
            >
              <input
                type="checkbox"
                checked={selected.has(o.id)}
                onChange={() => toggle(o.id)}
                className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-text-muted">{o.number}</span>
                  <span className="rounded-chip bg-surface-1 px-1.5 py-0.5 text-[10px] uppercase text-text-muted">
                    {o.type}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-text-primary">{o.description}</p>
                {o.dueDate && <p className="mt-0.5 text-[11px] text-text-muted">Due {o.dueDate}</p>}
              </div>
            </label>
          ))}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-control border border-border bg-surface-2 px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover"
        >
          Cancel
        </button>
        <button
          onClick={() => importSelected.mutate()}
          disabled={selected.size === 0 || importSelected.isPending}
          className="rounded-control bg-brand px-4 py-2 text-sm font-medium text-[#171200] hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {importSelected.isPending ? 'Importing…' : `Import ${selected.size || ''} selected`}
        </button>
      </div>
    </Modal>
  )
}
