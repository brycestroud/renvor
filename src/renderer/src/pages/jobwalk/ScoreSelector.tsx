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
      className={`flex w-full gap-1.5 rounded-control p-0.5 md:w-auto md:shrink-0 md:gap-1 ${
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
            className={`flex h-12 flex-1 items-center justify-center rounded-control border text-base font-semibold transition-colors md:h-11 md:w-11 md:flex-none md:text-sm ${
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
        className={`flex h-12 flex-[1.3] items-center justify-center rounded-control border px-3 text-xs font-semibold transition-colors md:h-11 md:flex-none ${
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
