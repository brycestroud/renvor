import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, ListChecks } from 'lucide-react'
import { EscalationDialog } from './EscalationDialog'
import { inputClass, selectClass } from '../../components/FormField'
import { gsApi } from '../../lib/gsApi'
import type { ActionItemDto, CreateActionItemInput } from '@shared/ipc-contract'

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const priorityColors: Record<ActionItemDto['priority'], string> = {
  high: 'text-danger',
  medium: 'text-warning',
  low: 'text-text-muted'
}

function ReviewRow({
  item,
  walkId,
  superintendentName,
  projectName
}: {
  item: ActionItemDto
  walkId: string
  superintendentName: string
  projectName: string
}): JSX.Element {
  const queryClient = useQueryClient()
  const [escalating, setEscalating] = useState(false)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['open-action-items'] })

  const transition = useMutation({
    mutationFn: (event: 'closed' | 'carried') =>
      gsApi().transitionActionItem({ id: item.id, event, walkId, note: null, notified: [] }),
    onSuccess: invalidate
  })

  return (
    <div className="flex items-center gap-3 border-t border-border-subtle py-2.5 first:border-t-0">
      <span className={`text-xs font-semibold uppercase ${priorityColors[item.priority]}`}>
        {item.priority}
      </span>
      <p className="min-w-0 flex-1 truncate text-sm text-text-primary">{item.text}</p>
      {item.dueDate && <span className="shrink-0 font-mono text-xs text-text-muted">{item.dueDate}</span>}
      <div className="flex shrink-0 gap-1.5">
        <button
          onClick={() => transition.mutate('closed')}
          disabled={transition.isPending}
          className="rounded-control border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface-hover"
        >
          Close
        </button>
        <button
          onClick={() => transition.mutate('carried')}
          disabled={transition.isPending}
          className="rounded-control border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface-hover"
        >
          Carry
        </button>
        <button
          onClick={() => setEscalating(true)}
          className="rounded-control border border-danger-muted bg-danger-muted px-2.5 py-1.5 text-xs text-danger hover:brightness-110"
        >
          Escalate
        </button>
      </div>

      {escalating && (
        <EscalationDialog
          item={item}
          walkId={walkId}
          superintendentName={superintendentName}
          projectName={projectName}
          onClose={() => setEscalating(false)}
        />
      )}
    </div>
  )
}

function NewActionItemForm({
  walkId,
  superintendentId,
  projectId
}: {
  walkId: string
  superintendentId: string
  projectId: string
}): JSX.Element {
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [ownerType, setOwnerType] = useState<CreateActionItemInput['ownerType']>('superintendent')
  const [dueDate, setDueDate] = useState(addDays(7))
  const [priority, setPriority] = useState<CreateActionItemInput['priority']>('medium')

  const create = useMutation({
    mutationFn: () =>
      gsApi().createActionItem({
        text: text.trim(),
        ownerType,
        superintendentId,
        projectId,
        dueDate,
        priority,
        source: 'walk',
        originWalkId: walkId
      }),
    onSuccess: () => {
      setText('')
      queryClient.invalidateQueries({ queryKey: ['open-action-items'] })
    }
  })

  return (
    <form
      className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (text.trim()) create.mutate()
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="New action item…"
        className={`${inputClass} min-w-[220px] flex-1`}
      />
      <select
        value={ownerType}
        onChange={(e) => setOwnerType(e.target.value as CreateActionItemInput['ownerType'])}
        className={`${selectClass} w-[140px]`}
      >
        <option value="superintendent">Super</option>
        <option value="gs">GS</option>
        <option value="pm">PM</option>
      </select>
      <input
        type="date"
        value={dueDate ?? ''}
        onChange={(e) => setDueDate(e.target.value)}
        className={`${inputClass} w-[150px]`}
      />
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value as CreateActionItemInput['priority'])}
        className={`${selectClass} w-[110px]`}
      >
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <button
        type="submit"
        disabled={!text.trim() || create.isPending}
        className="flex items-center gap-1 rounded-control bg-brand px-3 py-2 text-xs font-medium text-[#171200] hover:bg-brand-hover disabled:opacity-50"
      >
        <Plus size={14} /> Add
      </button>
    </form>
  )
}

export function ActionItemsSection({
  walkId,
  superintendentId,
  projectId,
  superintendentName,
  projectName
}: {
  walkId: string
  superintendentId: string
  projectId: string
  superintendentName: string
  projectName: string
}): JSX.Element {
  const { data: openItems, isLoading } = useQuery({
    queryKey: ['open-action-items', superintendentId, projectId],
    queryFn: () => gsApi().listOpenActionItems({ superintendentId, projectId }),
    enabled: Boolean(superintendentId && projectId)
  })

  const priorOpen = (openItems ?? []).filter((i) => i.originWalkId !== walkId)
  const addedThisWalk = (openItems ?? []).filter((i) => i.originWalkId === walkId)

  return (
    <div className="rounded-panel border border-border-subtle bg-surface-1 p-4">
      <div className="flex items-center gap-2">
        <ListChecks size={16} className="text-text-muted" />
        <h3 className="text-sm font-semibold text-text-primary">Action Items</h3>
      </div>

      {isLoading && <p className="mt-2 text-sm text-text-muted">Loading…</p>}

      {!isLoading && priorOpen.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-text-muted">
            Every open item for this super/project must be closed, carried, or escalated before
            you can submit.
          </p>
          <div className="mt-1">
            {priorOpen.map((item) => (
              <ReviewRow
                key={item.id}
                item={item}
                walkId={walkId}
                superintendentName={superintendentName}
                projectName={projectName}
              />
            ))}
          </div>
        </div>
      )}

      {!isLoading && priorOpen.length === 0 && (
        <p className="mt-2 text-sm text-text-muted">No open items carried over. Clear to submit.</p>
      )}

      {addedThisWalk.length > 0 && (
        <div className="mt-4 border-t border-border-subtle pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Added this walk
          </p>
          <div className="mt-1">
            {addedThisWalk.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-1.5 text-sm">
                <span className={`text-xs font-semibold uppercase ${priorityColors[item.priority]}`}>
                  {item.priority}
                </span>
                <span className="min-w-0 flex-1 truncate text-text-primary">{item.text}</span>
                {item.dueDate && (
                  <span className="shrink-0 font-mono text-xs text-text-muted">{item.dueDate}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-text-muted">
        Add 3–5 action items from this walk (not required).
      </p>
      <NewActionItemForm walkId={walkId} superintendentId={superintendentId} projectId={projectId} />
    </div>
  )
}
