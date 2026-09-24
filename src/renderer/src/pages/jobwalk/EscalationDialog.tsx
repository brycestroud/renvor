import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { FormField, inputClass } from '../../components/FormField'
import { gsApi } from '../../lib/gsApi'
import type { ActionItemDto } from '@shared/ipc-contract'

export function EscalationDialog({
  item,
  walkId,
  superintendentName,
  projectName,
  onClose
}: {
  item: ActionItemDto
  walkId: string
  superintendentName: string
  projectName: string
  onClose: () => void
}): JSX.Element {
  const queryClient = useQueryClient()
  const { data: people } = useQuery({ queryKey: ['people'], queryFn: () => gsApi().listPeople() })
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => gsApi().getSettings() })
  const [reason, setReason] = useState('')
  const [notified, setNotified] = useState<string[]>([])

  const escalate = useMutation({
    mutationFn: () =>
      gsApi().transitionActionItem({
        id: item.id,
        event: 'escalated',
        note: reason.trim() || null,
        notified,
        walkId
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-action-items'] })

      if (settings?.escalationMode === 'mailto') {
        const recipients = (people ?? []).filter((p) => notified.includes(p.id)).map((p) => p.email)
        if (recipients.length > 0) {
          const subject = `Escalation - ${superintendentName} - ${projectName}`
          const body = [
            `From: ${settings.gsName || 'GS'}`,
            `Superintendent: ${superintendentName}`,
            `Project: ${projectName}`,
            '',
            `Issue: ${item.text}`,
            reason.trim() ? `Reason: ${reason.trim()}` : null
          ]
            .filter(Boolean)
            .join('\n')
          const mailto = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
          window.open(mailto)
        }
      }

      onClose()
    }
  })

  function toggleNotify(id: string): void {
    setNotified((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <Modal title="Escalate Action Item" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">Issue</p>
          <p className="mt-1 text-sm text-text-primary">{item.text}</p>
        </div>

        <FormField label="Reason">
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why this needs leadership attention…"
          />
        </FormField>

        <div>
          <p className="mb-1.5 text-sm text-text-secondary">Notify</p>
          {(people?.length ?? 0) === 0 && (
            <p className="text-xs text-text-muted">
              No one in Settings &gt; People yet. Add escalation contacts there first.
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            {people?.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={notified.includes(p.id)}
                  onChange={() => toggleNotify(p.id)}
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                {p.name} <span className="text-text-muted">({p.email})</span>
              </label>
            ))}
          </div>
          {settings?.escalationMode === 'mailto' && (
            <p className="mt-2 text-xs text-text-muted">
              Opens a pre-filled email to the people checked above in your default mail app.
            </p>
          )}
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-control border border-border bg-surface-2 px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            onClick={() => escalate.mutate()}
            disabled={escalate.isPending}
            className="rounded-control bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:opacity-60"
          >
            {escalate.isPending ? 'Escalating…' : 'Escalate'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
