import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, ArrowUp, ArrowDown, Plus } from 'lucide-react'
import { gsApi } from '../../lib/gsApi'
import type { CategoryWithItems, ChecklistItemDto } from '@shared/ipc-contract'

const frequencyLabels: Record<ChecklistItemDto['frequency'], string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  once_per_job: 'Once per job'
}

function WeightInput({ category }: { category: CategoryWithItems }): JSX.Element {
  const queryClient = useQueryClient()
  const [value, setValue] = useState(String(category.weight ?? ''))
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: (weight: number | null) => gsApi().updateCategoryWeight({ id: category.id, weight }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    onError: (e: Error) => setError(e.message)
  })

  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          max={100}
          value={value}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            setError(null)
            const num = value.trim() === '' ? null : Number(value)
            if (num !== category.weight) save.mutate(num)
          }}
          className="w-16 rounded-control border border-border bg-surface-2 px-2 py-1 text-right font-mono text-xs text-text-primary outline-none focus:border-info"
        />
        <span className="text-xs text-text-muted">%</span>
      </div>
      {error && <span className="text-[10px] text-danger">{error}</span>}
    </div>
  )
}

function ItemRow({
  item,
  isFirst,
  isLast,
  onMove
}: {
  item: ChecklistItemDto
  isFirst: boolean
  isLast: boolean
  onMove: (direction: 'up' | 'down') => void
}): JSX.Element {
  const queryClient = useQueryClient()
  const [text, setText] = useState(item.text)
  const [error, setError] = useState<string | null>(null)

  const update = useMutation({
    mutationFn: (patch: { text?: string; frequency?: ChecklistItemDto['frequency']; active?: boolean }) =>
      gsApi().updateChecklistItem({ id: item.id, ...patch }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    onError: (e: Error) => setError(e.message)
  })

  return (
    <div className="flex flex-col gap-1 border-t border-border-subtle py-2 first:border-t-0">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <button
            disabled={isFirst}
            onClick={() => onMove('up')}
            className="text-text-muted hover:text-text-primary disabled:opacity-20"
          >
            <ArrowUp size={12} />
          </button>
          <button
            disabled={isLast}
            onClick={() => onMove('down')}
            className="text-text-muted hover:text-text-primary disabled:opacity-20"
          >
            <ArrowDown size={12} />
          </button>
        </div>

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            setError(null)
            if (text.trim() && text !== item.text) update.mutate({ text: text.trim() })
          }}
          disabled={!item.active}
          className="min-w-0 flex-1 rounded-control border border-transparent bg-transparent px-2 py-1 text-sm text-text-primary outline-none hover:border-border focus:border-info disabled:text-text-disabled"
        />

        {item.isCustom && (
          <span className="shrink-0 rounded-chip bg-info-muted px-1.5 py-0.5 text-[10px] text-info">
            Custom
          </span>
        )}

        <select
          value={item.frequency}
          onChange={(e) => {
            setError(null)
            update.mutate({ frequency: e.target.value as ChecklistItemDto['frequency'] })
          }}
          className="shrink-0 rounded-control border border-border bg-surface-2 px-2 py-1 text-xs text-text-secondary outline-none focus:border-info"
        >
          {Object.entries(frequencyLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <label className="flex shrink-0 items-center gap-1.5 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={item.active}
            onChange={(e) => {
              setError(null)
              update.mutate({ active: e.target.checked })
            }}
            className="h-3.5 w-3.5 accent-[var(--brand)]"
          />
          Active
        </label>
      </div>
      {error && <span className="pl-5 text-[11px] text-danger">{error}</span>}
    </div>
  )
}

function AddItemRow({ categoryId }: { categoryId: string }): JSX.Element {
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: () => gsApi().createChecklistItem({ categoryId, text: text.trim(), frequency: 'weekly' }),
    onSuccess: () => {
      setText('')
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (e: Error) => setError(e.message)
  })

  return (
    <form
      className="flex flex-col gap-1 border-t border-border-subtle pt-2"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        if (text.trim()) create.mutate()
      }}
    >
      <div className="flex items-center gap-2">
        <Plus size={14} className="shrink-0 text-text-muted" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add checklist item…"
          className="min-w-0 flex-1 rounded-control border border-border bg-surface-2 px-2 py-1.5 text-sm text-text-primary outline-none focus:border-info"
        />
        <button
          type="submit"
          disabled={!text.trim() || create.isPending}
          className="shrink-0 rounded-control bg-surface-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {error && <span className="pl-5 text-[11px] text-danger">{error}</span>}
    </form>
  )
}

function CategoryCard({ category }: { category: CategoryWithItems }): JSX.Element {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [reorderError, setReorderError] = useState<string | null>(null)
  const activeItems = category.items.filter((i) => i.active)

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) =>
      gsApi().reorderChecklistItems({ categoryId: category.id, orderedIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    onError: (e: Error) => setReorderError(e.message)
  })

  function move(itemId: string, direction: 'up' | 'down'): void {
    const ids = category.items.map((i) => i.id)
    const index = ids.indexOf(itemId)
    const swapWith = direction === 'up' ? index - 1 : index + 1
    if (swapWith < 0 || swapWith >= ids.length) return
    ;[ids[index], ids[swapWith]] = [ids[swapWith], ids[index]]
    setReorderError(null)
    reorder.mutate(ids)
  }

  return (
    <div className="rounded-panel border border-border-subtle bg-surface-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span className="text-sm font-semibold text-text-primary">{category.name}</span>
          <span className="text-xs text-text-muted">
            {activeItems.length} item{activeItems.length === 1 ? '' : 's'}
          </span>
        </div>
        {category.isGsOnly ? (
          <span className="text-xs text-text-muted">GS-only · not weighted</span>
        ) : (
          <WeightInput category={category} />
        )}
      </button>
      {reorderError && <p className="px-4 pb-2 text-[11px] text-danger">{reorderError}</p>}

      {expanded && (
        <div className="border-t border-border-subtle px-4 py-3">
          <div className="flex flex-col">
            {category.items.map((item, i) => (
              <ItemRow
                key={item.id}
                item={item}
                isFirst={i === 0}
                isLast={i === category.items.length - 1}
                onMove={(dir) => move(item.id, dir)}
              />
            ))}
          </div>
          <div className="mt-2">
            <AddItemRow categoryId={category.id} />
          </div>
        </div>
      )}
    </div>
  )
}

export function ChecklistPanel(): JSX.Element {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => gsApi().listCategories()
  })

  const weightedTotal = (categories ?? [])
    .filter((c) => !c.isGsOnly && c.weight != null)
    .reduce((sum, c) => sum + (c.weight ?? 0), 0)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Checklist</h2>
        <p className="mt-1 text-xs text-text-muted">
          Reorder, rename, activate/deactivate, or add items per category, and set each item's
          frequency. Deactivating keeps an item visible on walks that already scored it.
        </p>
      </div>

      {!isLoading && categories && (
        <div
          className={`rounded-control border px-3 py-2 text-xs ${
            weightedTotal === 100
              ? 'border-success-muted bg-success-muted text-success'
              : 'border-warning-muted bg-warning-muted text-warning'
          }`}
        >
          Weighted categories total <span className="font-mono">{weightedTotal}%</span>
          {weightedTotal !== 100 && ' — should total 100%'}
        </div>
      )}

      {isLoading && <p className="text-sm text-text-muted">Loading…</p>}

      <div className="flex flex-col gap-2">
        {categories?.map((cat) => (
          <CategoryCard key={cat.id} category={cat} />
        ))}
      </div>
    </div>
  )
}
