import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FileText, FolderOpen, Radio } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { gsApi, isRemote } from '../lib/gsApi'
import { scoreBand } from '@shared/scoring'
import type { ReportType } from '@shared/ipc-contract'

function thisMondayIso(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().slice(0, 10)
}

function weekEndFrom(weekStart: string): string {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + 6)
  return d.toISOString().slice(0, 10)
}

const bandChip: Record<'green' | 'yellow' | 'red', string> = {
  green: 'bg-success-muted text-success',
  yellow: 'bg-warning-muted text-warning',
  red: 'bg-danger-muted text-danger'
}

export function Reports(): JSX.Element {
  const queryClient = useQueryClient()
  const [weekStart, setWeekStart] = useState(thisMondayIso())
  const [type, setType] = useState<ReportType>('full')
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([])
  const [exportMessage, setExportMessage] = useState<string | null>(null)

  const weekEnd = weekEndFrom(weekStart)
  const isLiveWeek = weekStart === thisMondayIso()

  const { data: fullData, isLoading: fullLoading } = useQuery({
    queryKey: ['report-full', weekStart],
    queryFn: () => gsApi().getFullReportData(weekStart),
    enabled: type === 'full'
  })
  const { data: weekNotes } = useQuery({
    queryKey: ['report-week-notes', weekStart],
    queryFn: () => gsApi().getWeekNotes(weekStart),
    enabled: type === 'executive'
  })
  const { data: execData, isLoading: execLoading } = useQuery({
    queryKey: ['report-exec', weekStart, selectedNoteIds],
    queryFn: () => gsApi().getExecSummaryData({ weekStart, selectedNoteIds }),
    enabled: type === 'executive'
  })
  const { data: snapshots } = useQuery({
    queryKey: ['report-snapshots'],
    queryFn: () => gsApi().listReportSnapshots()
  })

  useEffect(() => {
    setSelectedNoteIds([])
  }, [weekStart, type])

  const exportFull = useMutation({
    mutationFn: () => gsApi().exportFullReportPdf(weekStart),
    onSuccess: (result) => {
      setExportMessage(result.canceled ? null : `Saved to ${result.path}`)
      queryClient.invalidateQueries({ queryKey: ['report-snapshots'] })
    }
  })

  const exportExec = useMutation({
    mutationFn: () => gsApi().exportExecSummaryPdf({ weekStart, selectedNoteIds }),
    onSuccess: (result) => {
      setExportMessage(result.canceled ? null : `Saved to ${result.path}`)
      queryClient.invalidateQueries({ queryKey: ['report-snapshots'] })
    }
  })

  const openSnapshot = useMutation({
    mutationFn: (id: string) => gsApi().openSnapshotPdf(id),
    onSuccess: (result) => {
      if (!result.success) setExportMessage(result.error)
    }
  })

  function toggleNote(id: string): void {
    setSelectedNoteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const summary = type === 'full' ? fullData?.summary : execData?.summary
  const escalatedItems = type === 'full' ? fullData?.escalatedItems : execData?.escalatedItems
  const redFlags = type === 'full' ? fullData?.redFlags : execData?.redFlags
  const isLoading = type === 'full' ? fullLoading : execLoading

  const isExporting = exportFull.isPending || exportExec.isPending

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader title="Reports" />

      <div className="flex flex-wrap items-end gap-3 md:gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Week starting</span>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="rounded-control border border-border bg-surface-2 px-3 py-2 text-text-primary outline-none focus:border-info"
          />
        </label>

        <div className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-secondary">Report type</span>
          <div className="flex gap-2">
            {(['full', 'executive'] as ReportType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded-control border px-3 py-2 text-sm capitalize transition-colors md:px-4 ${
                  type === t
                    ? 'border-brand-border bg-brand-muted text-brand'
                    : 'border-border bg-surface-2 text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {t === 'full' ? 'Full' : 'Executive'}
              </button>
            ))}
          </div>
        </div>

        {isLiveWeek && (
          <span className="flex items-center gap-1.5 rounded-chip bg-danger-muted px-2.5 py-1 text-xs font-medium text-danger">
            <Radio size={12} /> Live
          </span>
        )}

        {!isRemote && (
          <div className="ml-auto">
            <button
              onClick={() => (type === 'full' ? exportFull.mutate() : exportExec.mutate())}
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-control bg-brand px-4 py-2.5 text-sm font-medium text-[#171200] transition-colors hover:bg-brand-hover disabled:opacity-60"
            >
              <Download size={16} /> {isExporting ? 'Exporting…' : 'Export PDF'}
            </button>
          </div>
        )}
      </div>

      {exportMessage && <p className="text-xs text-text-secondary">{exportMessage}</p>}

      {isLoading && <p className="text-sm text-text-muted">Loading…</p>}

      {!isLoading && summary && (
        <div className="rounded-panel border border-border-subtle bg-white p-4 text-[#171b20] shadow-lg md:p-6">
          <h2 className="text-lg font-semibold">
            {type === 'full' ? 'Weekly Field Report' : 'Executive Summary'}
          </h2>
          <p className="mt-1 text-sm text-[#59616b]">
            {weekStart} – {weekEnd}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-xs uppercase text-[#838b94]">Walks Completed</p>
              <p className="font-semibold">{summary.walksCompleted}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-[#838b94]">Supers Walked</p>
              <p className="font-semibold">
                {summary.supersWalked} / {summary.totalActiveSupers}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-[#838b94]">Average Score</p>
              <p className="font-semibold">{summary.averageScore != null ? summary.averageScore.toFixed(1) : '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-[#838b94]">Escalations</p>
              <p className="font-semibold">{escalatedItems?.length ?? 0}</p>
            </div>
          </div>

          {redFlags && redFlags.length > 0 && (
            <div className="mt-4 border-t border-[#eceeef] pt-4">
              <p className="text-xs font-semibold uppercase text-[#838b94]">Red Flags</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {redFlags.map((f, i) => (
                  <span key={i} className={`rounded-chip px-2 py-0.5 text-xs ${bandChip[scoreBand(f.score)]}`}>
                    {f.superintendentName} — {f.categoryName} {f.score.toFixed(1)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {type === 'full' && fullData && (
            <div className="mt-4 border-t border-[#eceeef] pt-4">
              <p className="text-xs font-semibold uppercase text-[#838b94]">
                {fullData.walks.length} walk{fullData.walks.length === 1 ? '' : 's'} this week
              </p>
              {fullData.supersNotWalked.length > 0 && (
                <p className="mt-1 text-xs text-[#59616b]">Not walked: {fullData.supersNotWalked.join(', ')}</p>
              )}
            </div>
          )}
        </div>
      )}

      {type === 'executive' && (
        <div className="rounded-panel border border-border-subtle bg-surface-1 p-4">
          <p className="text-sm font-semibold text-text-primary">Key Notes</p>
          <p className="mt-1 text-xs text-text-muted">
            Pick 3–5 notes from this week's walks to feature (not required).
          </p>
          <div className="mt-3 flex flex-col gap-1.5">
            {(weekNotes ?? []).length === 0 && <p className="text-sm text-text-muted">No notes recorded this week.</p>}
            {weekNotes?.map((n) => (
              <label key={n.id} className="flex items-start gap-2 rounded-control px-2 py-1.5 text-sm hover:bg-surface-hover">
                <input
                  type="checkbox"
                  checked={selectedNoteIds.includes(n.id)}
                  onChange={() => toggleNote(n.id)}
                  className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
                />
                <span>
                  <span className="font-medium text-text-primary">
                    {n.superintendentName} ({n.projectName}
                    {n.categoryName ? ` — ${n.categoryName}` : ''}):
                  </span>{' '}
                  <span className="text-text-secondary">{n.text}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className={isRemote ? 'hidden' : undefined}>
        <h2 className="mb-3 text-sm font-semibold text-text-primary">Past Reports</h2>
        {(snapshots?.length ?? 0) === 0 ? (
          <p className="text-sm text-text-muted">Exported reports will show up here.</p>
        ) : (
          <div className="overflow-hidden rounded-panel border border-border-subtle">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-1 text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-2.5 font-medium">Week</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Exported</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {snapshots?.map((s) => (
                  <tr key={s.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-hover">
                    <td className="px-4 py-2.5 font-mono text-text-secondary">{s.weekStart}</td>
                    <td className="px-4 py-2.5 text-text-secondary capitalize">{s.reportType}</td>
                    <td className="px-4 py-2.5 text-text-secondary">
                      {new Date(s.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => openSnapshot.mutate(s.id)}
                        disabled={!s.pdfPath}
                        className="flex items-center gap-1 text-xs text-info hover:underline disabled:cursor-not-allowed disabled:text-text-disabled disabled:no-underline"
                      >
                        <FolderOpen size={13} /> Open PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && !summary && (
        <div className="flex items-center gap-2 rounded-control border border-dashed border-border-subtle px-4 py-6 text-sm text-text-muted">
          <FileText size={16} />
          No submitted walks for {weekStart} – {weekEnd} yet. Pick a different week above, or
          complete a walk from Job Walk to see it here.
        </div>
      )}
    </div>
  )
}
