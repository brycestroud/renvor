import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { ArrowLeft, FileText, ListChecks, Mail, Pencil } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { SuperintendentFormModal, nccerLabels } from '../components/SuperintendentFormModal'
import { gsApi } from '../lib/gsApi'
import { scoreBand, unweightedAverage, weightedOverallScore } from '@shared/scoring'

const priorityColors: Record<string, string> = {
  high: 'text-danger',
  medium: 'text-warning',
  low: 'text-text-muted'
}

const bandChip: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-success-muted text-success',
  yellow: 'bg-warning-muted text-warning',
  red: 'bg-danger-muted text-danger'
}

export function SuperintendentDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [compareCategoryId, setCompareCategoryId] = useState('')

  const { data: supers } = useQuery({
    queryKey: ['superintendents'],
    queryFn: () => gsApi().listSuperintendents()
  })
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => gsApi().listProjects() })
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => gsApi().listCategories()
  })
  const { data: history, isLoading } = useQuery({
    queryKey: ['super-walk-history', id],
    queryFn: () => gsApi().getSuperintendentWalkHistory(id!),
    enabled: Boolean(id)
  })
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => gsApi().getSettings() })
  const { data: actionItems } = useQuery({
    queryKey: ['action-items-all'],
    queryFn: () => gsApi().listAllActionItems()
  })

  const sup = supers?.find((s) => s.id === id)
  const activeCategories = useMemo(
    () => (categories ?? []).filter((c) => c.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  )
  const weightedEnabled = settings?.weightedScoringEnabled ?? true

  const chronological = useMemo(() => [...(history ?? [])].sort((a, b) => (a.date < b.date ? -1 : 1)), [history])

  const chartData = useMemo(
    () =>
      chronological.map((walk) => {
        const overall = weightedEnabled
          ? weightedOverallScore(
              activeCategories.map((c) => ({
                categoryId: c.id,
                score: walk.categoryScores.find((cs) => cs.categoryId === c.id)?.average ?? null,
                weight: c.weight,
                isGsOnly: c.isGsOnly
              }))
            )
          : unweightedAverage(
              activeCategories
                .filter((c) => !c.isGsOnly)
                .map((c) => walk.categoryScores.find((cs) => cs.categoryId === c.id)?.average ?? null)
            )
        const compare = compareCategoryId
          ? (walk.categoryScores.find((cs) => cs.categoryId === compareCategoryId)?.average ?? null)
          : null
        return {
          date: walk.date,
          overall: overall != null ? Number(overall.toFixed(2)) : null,
          compare: compare != null ? Number(compare.toFixed(2)) : null
        }
      }),
    [chronological, activeCategories, weightedEnabled, compareCategoryId]
  )

  const allTimeCategoryAverages = useMemo(
    () =>
      activeCategories.map((c) => ({
        category: c,
        average: unweightedAverage(
          (history ?? []).map((w) => w.categoryScores.find((cs) => cs.categoryId === c.id)?.average ?? null)
        )
      })),
    [activeCategories, history]
  )

  const openItemsForSuper = (actionItems ?? []).filter(
    (i) => i.superintendentId === id && (i.status === 'open' || i.status === 'carried')
  )

  if (!sup) {
    return <p className="text-sm text-text-muted">Loading…</p>
  }

  const homeProject = projects?.find((p) => p.id === sup.homeProjectId)
  const compareCategory = activeCategories.find((c) => c.id === compareCategoryId)

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => navigate('/')}
        className="flex w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text-primary"
      >
        <ArrowLeft size={14} /> Dashboard
      </button>

      <div className="rounded-panel border border-border-subtle bg-surface-1 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-text-primary">{sup.name}</h1>
              <span
                className={`rounded-chip px-2 py-0.5 text-xs ${
                  sup.active ? 'bg-success-muted text-success' : 'bg-surface-2 text-text-muted'
                }`}
              >
                {sup.active ? 'Active' : 'Inactive'}
              </span>
              <span className="rounded-chip bg-info-muted px-2 py-0.5 text-xs text-info">
                NCCER: {nccerLabels[sup.nccerStatus]}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-secondary">
              <span>Home: {homeProject?.name ?? '—'}</span>
              <span>{sup.email || '—'}</span>
              <span>{sup.phone || '—'}</span>
              <span>{sup.yearsExperience != null ? `${sup.yearsExperience} yrs experience` : '—'}</span>
            </div>
            {sup.customFields.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {sup.customFields.map((f) => (
                  <span
                    key={f.id}
                    className="rounded-chip border border-border-subtle bg-surface-2 px-2 py-1 text-xs text-text-secondary"
                  >
                    <span className="text-text-muted">{f.label}:</span> {f.value}
                  </span>
                ))}
              </div>
            )}
            {sup.notes && <p className="mt-3 max-w-2xl text-sm text-text-secondary">{sup.notes}</p>}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 rounded-control border border-border bg-surface-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover"
          >
            <Pencil size={14} /> Edit
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-border-subtle pt-4">
          {allTimeCategoryAverages.map(({ category, average }) => (
            <span
              key={category.id}
              className={`rounded-chip px-2.5 py-1 text-xs ${
                average != null ? bandChip[scoreBand(average)] : 'bg-surface-2 text-text-disabled'
              }`}
              title={category.name}
            >
              {category.name}: {average != null ? average.toFixed(1) : '—'}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-panel border border-border-subtle bg-surface-1 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Trend</h2>
          <select
            value={compareCategoryId}
            onChange={(e) => setCompareCategoryId(e.target.value)}
            className="rounded-control border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-text-secondary outline-none focus:border-info"
          >
            <option value="">Compare category…</option>
            {activeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {chartData.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">No submitted walks yet.</p>
        ) : (
          <div className="mt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 12
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="overall"
                  name="Overall"
                  stroke="var(--brand)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
                {compareCategory && (
                  <Line
                    type="monotone"
                    dataKey="compare"
                    name={compareCategory.name}
                    stroke="var(--info)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Walk History</h2>
          {isLoading && <p className="text-sm text-text-muted">Loading…</p>}
          {!isLoading && chronological.length === 0 && (
            <EmptyState
              icon={FileText}
              title="No walks yet"
              description="Submitted walks for this superintendent will show up here."
            />
          )}
          {!isLoading && chronological.length > 0 && (
            <div className="overflow-hidden rounded-panel border border-border-subtle">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-1 text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Project</th>
                    <th className="px-4 py-2.5 font-medium">Visit</th>
                    <th className="px-4 py-2.5 font-medium text-right">Overall</th>
                    <th className="px-4 py-2.5 font-medium text-right">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {[...chronological].reverse().map((walk) => {
                    const overall = weightedEnabled
                      ? weightedOverallScore(
                          activeCategories.map((c) => ({
                            categoryId: c.id,
                            score: walk.categoryScores.find((cs) => cs.categoryId === c.id)?.average ?? null,
                            weight: c.weight,
                            isGsOnly: c.isGsOnly
                          }))
                        )
                      : unweightedAverage(
                          activeCategories
                            .filter((c) => !c.isGsOnly)
                            .map((c) => walk.categoryScores.find((cs) => cs.categoryId === c.id)?.average ?? null)
                        )
                    return (
                      <tr
                        key={walk.walkId}
                        onClick={() => navigate(`/job-walk?walk=${walk.walkId}`)}
                        className="cursor-pointer border-b border-border-subtle last:border-0 hover:bg-surface-hover"
                      >
                        <td className="px-4 py-2.5 font-mono text-text-secondary">{walk.date}</td>
                        <td className="px-4 py-2.5 text-text-secondary">{walk.projectName}</td>
                        <td className="px-4 py-2.5 text-text-secondary">
                          {walk.visitType === 'home' ? 'Home' : 'Cross-Project'}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span
                            className={`inline-block rounded-chip px-2 py-0.5 font-mono text-xs ${
                              overall != null ? bandChip[scoreBand(overall)] : 'text-text-disabled'
                            }`}
                          >
                            {overall != null ? overall.toFixed(1) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            disabled
                            title="Coming in Phase 6"
                            className="cursor-not-allowed text-xs text-text-disabled"
                          >
                            <Mail size={13} className="inline" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Open Action Items</h2>
          {openItemsForSuper.length === 0 ? (
            <EmptyState icon={ListChecks} title="Nothing open" description="No open action items for this super." />
          ) : (
            <div className="flex flex-col gap-2">
              {openItemsForSuper.map((item) => (
                <div key={item.id} className="rounded-panel border border-border-subtle bg-surface-1 p-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold uppercase ${priorityColors[item.priority]}`}>
                      {item.priority}
                    </span>
                    {item.dueDate && <span className="font-mono text-xs text-text-muted">{item.dueDate}</span>}
                  </div>
                  <p className="mt-1 text-sm text-text-primary">{item.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && <SuperintendentFormModal sup={sup} onClose={() => setEditing(false)} />}
    </div>
  )
}
