import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { gsApi } from '../../lib/gsApi'
import type { ActionItemDto, ActionItemEventDto } from '@shared/ipc-contract'

const eventLabels: Record<ActionItemEventDto['event'], string> = {
  created: 'Created',
  edited: 'Edited',
  carried: 'Carried forward',
  closed: 'Closed',
  escalated: 'Escalated',
  de_escalated: 'De-escalated',
  reopened: 'Reopened'
}

const eventColors: Record<ActionItemEventDto['event'], string> = {
  created: 'bg-surface-2 text-text-secondary',
  edited: 'bg-surface-2 text-text-secondary',
  carried: 'bg-warning-muted text-warning',
  closed: 'bg-success-muted text-success',
  escalated: 'bg-danger-muted text-danger',
  de_escalated: 'bg-info-muted text-info',
  reopened: 'bg-info-muted text-info'
}

export function HistoryDrawer({
  item,
  onClose
}: {
  item: ActionItemDto
  onClose: () => void
}): JSX.Element {
  const { data: events, isLoading } = useQuery({
    queryKey: ['action-item-events', item.id],
    queryFn: () => gsApi().getActionItemEvents({ actionItemId: item.id })
  })

  return (
    <Modal title="History" onClose={onClose} width="lg">
      <p className="text-sm text-text-primary">{item.text}</p>

      {isLoading && <p className="mt-4 text-sm text-text-muted">Loading…</p>}

      <div className="mt-4 flex flex-col gap-3">
        {events?.map((e) => (
          <div key={e.id} className="flex gap-3 border-t border-border-subtle pt-3 first:border-t-0 first:pt-0">
            <span className={`h-fit shrink-0 rounded-chip px-2 py-0.5 text-xs ${eventColors[e.event]}`}>
              {eventLabels[e.event]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-text-muted">
                {new Date(e.createdAt).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              {e.note && <p className="mt-1 text-sm text-text-secondary">{e.note}</p>}
              {e.notifiedNames.length > 0 && (
                <p className="mt-1 text-xs text-text-muted">Notified: {e.notifiedNames.join(', ')}</p>
              )}
            </div>
          </div>
        ))}
        {!isLoading && (events?.length ?? 0) === 0 && (
          <p className="text-sm text-text-muted">No events recorded yet.</p>
        )}
      </div>
    </Modal>
  )
}
