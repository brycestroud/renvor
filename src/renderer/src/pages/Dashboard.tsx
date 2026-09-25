import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowDown, ArrowUp, LayoutDashboard } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { gsApi } from '../lib/gsApi'
import { scoreBand, unweightedAverage, weightedOverallScore } from '@shared/scoring'
import type { MatrixRow } from '@shared/ipc-contract'

type RangePreset = 'week' | '30' | '90' | 'ytd' | 'all'

const rangeLabels: Record<RangePreset, string> = {
  week: 'This Week',
  '30': 'Last 30 Days',
  '90': 'Last 90 Days',
  ytd: 'YTD',
  all: 'All Time'
}

const categoryAbbrev: Record<string, string> = {
  safety: 'SAF',
  schedule: 'SCH',
  quality_control: 'QC',
  superintendent_traits: 'TRAITS',
  knowledge: 'KNOW',
  customer_service: 'CS',
  budget: 'BUDGET',
  rocks: 'ROCKS',
  record_keeping: 'RECS',
  near_miss_reporting: 'NEAR-MISS',
  rework_punch_volume: 'REWORK',
  subcontractor_communication: 'SUBS',
  site_culture_observation: 'CULTURE'
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function startOfYearIso(): string {
  return `${new Date().getFullYear()}-01-01`
}

function rangeToFromTo(preset: RangePreset): { from: string; to: string } {
  const to = todayIso()
  switch (preset) {
    case 'week': {
      const d = new Date()
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(d.setDate(diff))
      return { from: monday.toISOString().slice(0, 10), to }
    }
    case '30':
      return { from: daysAgoIso(30), to }
    case '90':
      return { from: daysAgoIso(90), to }
    case 'ytd':
      return { from: startOfYearIso(), to }
    case 'all':
      return { from: '1970-01-01', to }
  }
}

function daysSince(dateIso: string | null, today: string): number | null {
  if (!dateIso) return null
  const a = new Date(dateIso).getTime()
  const b = new Date(today).getTime()
  return Math.round((b - a) / 86_400_000)
}

const scoreCellClass: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-success-muted text-success',
  yellow: 'bg-warning-muted text-warning',
  red: 'bg-danger-muted text-danger'
}

type SortKey = 'name' | 'walks' | 'lastWalk' | 'overall' | string

export function Dashboard(): JSX.Element {
  const navigate = useNavigate()
  const [range, setRange] = useState<RangePreset>('90')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const { from, to } = rangeToFromTo(range)

  const { data: matrix, isLoading } = useQuery({
    queryKey: ['dashboard-matrix', from, to],
    queryFn: () => gsApi().getDashboardMatrix({ from, to })
  })
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => gsApi().listCategories()
  })
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => gsApi().getSettings() })
  const { data: actionItems } = useQuery({
    queryKey: ['action-items-all'],
    queryFn: () => gsApi().listAllActionItems()
  })

  const activeCategories = useMemo(
    () => (categories ?? []).filter((c) => c.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  )

  const today = todayIso()
  const attentionDays = settings?.needsAttentionDays ?? 14
  const weightedEnabled = settings?.weightedScoringEnabled ?? true

  function overallFor(row: MatrixRow): number | null {
    if (weightedEnabled) {
      return weightedOverallScore(
        activeCategories.map((c) => ({
          categoryId: c.id,
          score: row.categoryScores.find((cs) => cs.categoryId === c.id)?.average ?? null,
          weight: c.weight,
          isGsOnly: c.isGsOnly
        }))
      )
    }
    return unweightedAverage(
      activeCategories.filter((c) => !c.isGsOnly).map((c) => row.categoryScores.find((cs) => cs.categoryId === c.id)?.average ?? null)
    )
  }

  const rows = matrix?.rows ?? []

  const sortedRows = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      let av: number | string | null = null
      let bv: number | string | null = null
      if (sortKey === 'name') {
        av = a.name
        bv = b.name
      } else if (sortKey === 'walks') {
        av = a.walksInRange
        bv = b.walksInRange
      } else if (sortKey === 'lastWalk') {
        av = a.lastWalkDate ?? ''
        bv = b.lastWalkDate ?? ''
      } else if (sortKey === 'overall') {
        av = overallFor(a)
        bv = overallFor(b)
      } else {
        av = a.categoryScores.find((cs) => cs.categoryId === sortKey)?.average ?? null
        bv = b.categoryScores.find((cs) => cs.categoryId === sortKey)?.average ?? null
      }
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return copy
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortKey, sortDir, activeCategories, weightedEnabled])

  function toggleSort(key: SortKey): void {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const needsAttention = rows.filter((r) => {
    const noRecentWalk = (daysSince(r.lastWalkDate, today) ?? Infinity) > attentionDays
    const lowCategory = r.categoryScores.some((cs) => cs.average != null && cs.average < 3.0)
    return noRecentWalk || lowCategory
  })

  const openActionItems = (actionItems ?? []).filter((i) => i.status === 'open' || i.status === 'carried').length
  const overdueActionItems = (actionItems ?? []).filter((i) => {
    if (!i.dueDate || i.status === 'closed') return false
    return i.dueDate < today
  }).length

  const avgScoreInRange = unweightedAverage(rows.map((r) => overallFor(r)))

  const SortHeader = ({ label, sk }: { label: string; sk: SortKey }): JSX.Element => (
    <button
      onClick={() => toggleSort(sk)}
      className="flex items-center gap-1 whitespace-nowrap text-xs font-medium uppercase tracking-wide text-text-muted hover:text-text-primary"
    >
      {label}
      {sortKey === sk && (sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
    </button>
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        actions={
          <div className="flex gap-1.5">
            {(Object.keys(rangeLabels) as RangePreset[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-control border px-3 py-1.5 text-xs transition-colors ${
                  range === r
                    ? 'border-brand-border bg-brand-muted text-brand'
                    : 'border-border bg-surface-2 text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {rangeLabels[r]}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-panel border border-border-subtle bg-surface-1 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-text-muted">Active Supers</p>
          <p className="mt-1 font-mono text-2xl text-text-primary">{rows.length}</p>
        </div>
        <div className="rounded-panel border border-border-subtle bg-surface-1 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-text-muted">Walks This Week</p>
          <p className="mt-1 font-mono text-2xl text-text-primary">{matrix?.walksThisWeekCount ?? 0}</p>
        </div>
        <div className="rounded-panel border border-border-subtle bg-surface-1 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-text-muted">Avg Score ({rangeLabels[range]})</p>
          <p className="mt-1 font-mono text-2xl text-text-primary">
            {avgScoreInRange != null ? avgScoreInRange.toFixed(1) : '—'}
          </p>
        </div>
        <div className="rounded-panel border border-border-subtle bg-surface-1 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-text-muted">Open Action Items</p>
          <p className="mt-1 font-mono text-2xl text-text-primary">{openActionItems}</p>
        </div>
        <div className="rounded-panel border border-border-subtle bg-surface-1 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-text-muted">Overdue</p>
          <p className="mt-1 font-mono text-2xl text-danger">{overdueActionItems}</p>
        </div>
      </div>

      {needsAttention.length > 0 && (
        <div className="rounded-panel border border-warning-muted bg-warning-muted px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-warning">
            <AlertTriangle size={14} /> Needs Attention
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {needsAttention.map((r) => {
              const since = daysSince(r.lastWalkDate, today)
              const lowCats = r.categoryScores.filter((cs) => cs.average != null && cs.average < 3.0)
              return (
                <button
                  key={r.superintendentId}
                  onClick={() => navigate(`/superintendents/${r.superintendentId}`)}
                  className="flex items-center gap-2 rounded-control px-2 py-1 text-left text-sm text-text-primary hover:bg-surface-hover"
                >
                  <span className="font-medium">{r.name}</span>
                  {(since ?? 0) > attentionDays && (
                    <span className="text-xs text-warning">
                      {r.lastWalkDate ? `No walk in ${since} days` : 'Never walked'}
                    </span>
                  )}
                  {lowCats.length > 0 && (
                    <span className="text-xs text-danger">
                      {lowCats
                        .map((c) => categoryAbbrev[activeCategories.find((ac) => ac.id === c.categoryId)?.key ?? ''] ?? '')
                        .join(', ')}{' '}
                      below 3.0
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm text-text-muted">Loading…</p>}

      {!isLoading && rows.length === 0 && (
        <EmptyState
          icon={LayoutDashboard}
          title="No active superintendents"
          description="Add a superintendent and complete a walk to see the matrix."
        />
      )}

      {!isLoading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-panel border border-border-subtle">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-1">
                <th className="sticky left-0 z-10 bg-surface-1 px-4 py-3">
                  <SortHeader label="Name" sk="name" />
                </th>
                <th className="px-3 py-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Home Project</span>
                </th>
                <th className="px-3 py-3">
                  <SortHeader label="Walks" sk="walks" />
                </th>
                <th className="px-3 py-3">
                  <SortHeader label="Last Walk" sk="lastWalk" />
                </th>
                {activeCategories.map((c) => (
                  <th key={c.id} className="px-3 py-3">
                    <SortHeader label={categoryAbbrev[c.key] ?? c.name.slice(0, 4).toUpperCase()} sk={c.id} />
                  </th>
                ))}
                {weightedEnabled && (
                  <th className="px-3 py-3">
                    <SortHeader label="Overall" sk="overall" />
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => {
                const overall = overallFor(r)
                return (
                  <tr
                    key={r.superintendentId}
                    onClick={() => navigate(`/superintendents/${r.superintendentId}`)}
                    className="cursor-pointer border-b border-border-subtle last:border-0 hover:bg-surface-hover"
                  >
                    <td className="sticky left-0 z-10 bg-canvas px-4 py-2.5 font-medium text-text-primary">
                      {r.name}
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary">{r.homeProjectName ?? '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-text-secondary">{r.walksInRange}</td>
                    <td className="px-3 py-2.5 font-mono text-text-secondary">{r.lastWalkDate ?? '—'}</td>
                    {activeCategories.map((c) => {
                      const val = r.categoryScores.find((cs) => cs.categoryId === c.id)?.average ?? null
                      return (
                        <td key={c.id} className="px-3 py-2.5">
                          <span
                            className={`inline-block min-w-[42px] rounded-chip px-2 py-0.5 text-center font-mono text-xs ${
                              val != null ? scoreCellClass[scoreBand(val)] : 'text-text-disabled'
                            }`}
                          >
                            {val != null ? val.toFixed(1) : '—'}
                          </span>
                        </td>
                      )
                    })}
                    {weightedEnabled && (
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block min-w-[42px] rounded-chip px-2 py-0.5 text-center font-mono text-xs font-semibold ${
                            overall != null ? scoreCellClass[scoreBand(overall)] : 'text-text-disabled'
                          }`}
                        >
                          {overall != null ? overall.toFixed(1) : '—'}
                        </span>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
