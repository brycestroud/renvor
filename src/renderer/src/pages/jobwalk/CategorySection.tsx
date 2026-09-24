import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ScoreSelector } from './ScoreSelector'
import { useAutosaveText } from '../../lib/useAutosaveText'
import { categoryScore, scoreBand } from '@shared/scoring'
import type { CategoryWithItems, WalkItemScoreDto } from '@shared/ipc-contract'

const bandChip: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-success-muted text-success',
  yellow: 'bg-warning-muted text-warning',
  red: 'bg-danger-muted text-danger'
}

const frequencyLabels: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  once_per_job: 'Once/job'
}

export function CategorySection({
  category,
  scoresByItemId,
  dueByItemId,
  categoryNote,
  focusedItemId,
  onFocusItem,
  onScoreChange,
  onNoteSave,
  defaultExpanded = true
}: {
  category: CategoryWithItems
  scoresByItemId: Map<string, WalkItemScoreDto>
  dueByItemId: Map<string, boolean>
  categoryNote: string
  focusedItemId: string | null
  onFocusItem: (id: string) => void
  onScoreChange: (checklistItemId: string, score: number | null, isNa: boolean) => void
  onNoteSave: (categoryId: string, notes: string) => void
  defaultExpanded?: boolean
}): JSX.Element {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const activeItems = category.items.filter((i) => i.active)

  const entries = activeItems.map((i) => {
    const s = scoresByItemId.get(i.id)
    return { score: s?.score ?? null, isNa: s?.isNa ?? false }
  })
  const live = categoryScore(entries)
  const scoredCount = entries.filter((e) => e.score != null || e.isNa).length

  const notes = useAutosaveText(categoryNote, (v) => onNoteSave(category.id, v))

  return (
    <div className="rounded-panel border border-border-subtle bg-surface-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span className="text-sm font-semibold text-text-primary">{category.name}</span>
          <span className="font-mono text-xs text-text-muted">
            {scoredCount}/{activeItems.length}
          </span>
        </div>
        <span
          className={`rounded-chip px-2 py-0.5 font-mono text-xs ${
            live != null ? bandChip[scoreBand(live)] : 'bg-surface-2 text-text-muted'
          }`}
        >
          {live != null ? live.toFixed(1) : '—'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border-subtle px-4 py-3">
          <div className="flex flex-col divide-y divide-border-subtle">
            {activeItems.map((item) => {
              const s = scoresByItemId.get(item.id)
              const due = dueByItemId.get(item.id) ?? false
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 py-2.5 pl-3 ${
                    due ? 'border-l-2 border-brand' : 'border-l-2 border-transparent'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-primary">{item.text}</p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-text-muted">
                      <span>{frequencyLabels[item.frequency]}</span>
                      {due && <span className="font-medium text-brand">DUE</span>}
                    </div>
                  </div>
                  <ScoreSelector
                    score={s?.score ?? null}
                    isNa={s?.isNa ?? false}
                    focused={focusedItemId === item.id}
                    onChange={(score, isNa) => {
                      onFocusItem(item.id)
                      onScoreChange(item.id, score, isNa)
                    }}
                  />
                </div>
              )
            })}
          </div>

          <textarea
            value={notes.value}
            onChange={(e) => notes.onChange(e.target.value)}
            onBlur={notes.onBlur}
            placeholder={`Notes for ${category.name}…`}
            className="mt-3 min-h-[60px] w-full resize-y rounded-control border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none focus:border-info"
          />
        </div>
      )}
    </div>
  )
}
