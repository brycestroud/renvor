import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { FormField, inputClass } from '../../components/FormField'
import { gsApi } from '../../lib/gsApi'
import type { ActionItemDto } from '@shared/ipc-contract'

export function DeEscalateDialog({
  item,
  onClose
}: {
  item: ActionItemDto
  onClose: () => void
}): JSX.Element {
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')

  const deEscalate = useMutation({
    mutationFn: () =>
      gsApi().transitionActionItem({
        id: item.id,
        event: 'de_escalated',
        note: note.trim() || null,
        notified: [],
        walkId: null
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-items-all'] })
      queryClient.invalidateQueries({ queryKey: ['open-action-items'] })
      onClose()
    }
  })

  return (
    <Modal title="De-escalate Action Item" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">Issue</p>
          <p className="mt-1 text-sm text-text-primary">{item.text}</p>
        </div>

        <FormField label="Resolution note (optional)">
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What resolved this…"
          />
        </FormField>

        <p className="text-xs text-text-muted">Moves this item back to Open.</p>

        <div className="mt-2 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-control border border-border bg-surface-2 px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            onClick={() => deEscalate.mutate()}
            disabled={deEscalate.isPending}
            className="rounded-control bg-brand px-4 py-2 text-sm font-medium text-[#171200] transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {deEscalate.isPending ? 'Saving…' : 'De-escalate'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
