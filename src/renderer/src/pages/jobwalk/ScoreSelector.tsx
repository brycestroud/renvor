import { forwardRef } from 'react'
import { scoreBand } from '@shared/scoring'

const scoreColors: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-success text-[#08150F] border-success',
  yellow: 'bg-warning text-[#1F1600] border-warning',
  red: 'bg-danger text-white border-danger'
}

export const ScoreSelector = forwardRef<
  HTMLDivElement,
  {
    score: number | null
    isNa: boolean
    onChange: (score: number | null, isNa: boolean) => void
    focused?: boolean
  }
>(function ScoreSelector({ score, isNa, onChange, focused }, ref) {
  return (
    <div
      ref={ref}
      className={`flex shrink-0 gap-1 rounded-control p-0.5 ${
        focused ? 'ring-2 ring-info ring-offset-1 ring-offset-surface-1' : ''
      }`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const selected = score === n && !isNa
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n, false)}
            className={`flex h-11 w-11 items-center justify-center rounded-control border text-sm font-semibold transition-colors ${
              selected
                ? scoreColors[scoreBand(n)]
                : 'border-border bg-surface-2 text-text-secondary hover:bg-surface-hover'
            }`}
          >
            {n}
          </button>
        )
      })}
      <button
        type="button"
        onClick={() => onChange(null, true)}
        className={`flex h-11 items-center justify-center rounded-control border px-3 text-xs font-semibold transition-colors ${
          isNa
            ? 'border-border-strong bg-surface-2 text-text-primary'
            : 'border-border bg-surface-2 text-text-muted hover:bg-surface-hover'
        }`}
      >
        N/A
      </button>
    </div>
  )
})
