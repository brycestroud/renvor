import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { gsApi } from '../../lib/gsApi'
import { PrintLayout, PrintHeading, PrintSection, scoreColor } from './PrintLayout'
import type { RedFlag, ReportEscalatedItem, ReportSummaryStats } from '@shared/ipc-contract'

function SummaryGrid({ summary, weekStart, weekEnd }: { summary: ReportSummaryStats; weekStart: string; weekEnd: string }): JSX.Element {
  return (
    <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, fontSize: 12 }}>
      <div>
        <div style={{ color: '#838b94', fontSize: 10, textTransform: 'uppercase' }}>Week</div>
        <div style={{ fontWeight: 600 }}>
          {weekStart} – {weekEnd}
        </div>
      </div>
      <div>
        <div style={{ color: '#838b94', fontSize: 10, textTransform: 'uppercase' }}>Walks Completed</div>
        <div style={{ fontWeight: 600 }}>{summary.walksCompleted}</div>
      </div>
      <div>
        <div style={{ color: '#838b94', fontSize: 10, textTransform: 'uppercase' }}>Supers Walked</div>
        <div style={{ fontWeight: 600 }}>
          {summary.supersWalked} / {summary.totalActiveSupers}
        </div>
      </div>
      <div>
        <div style={{ color: '#838b94', fontSize: 10, textTransform: 'uppercase' }}>Average Score</div>
        <div style={{ fontWeight: 600, color: scoreColor(summary.averageScore) }}>
          {summary.averageScore != null ? summary.averageScore.toFixed(1) : '—'}
        </div>
      </div>
    </div>
  )
}

function EscalatedList({ items }: { items: ReportEscalatedItem[] }): JSX.Element {
  if (items.length === 0) return <p style={{ margin: 0, color: '#838b94' }}>None this week.</p>
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {items.map((i) => (
        <li key={i.id} style={{ marginBottom: 4 }}>
          <strong>{i.superintendentName ?? '—'}</strong> ({i.projectName ?? '—'}): {i.text}
        </li>
      ))}
    </ul>
  )
}

function RedFlagList({ flags }: { flags: RedFlag[] }): JSX.Element {
  if (flags.length === 0) return <p style={{ margin: 0, color: '#838b94' }}>None this week.</p>
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {flags.map((f, i) => (
        <li key={i} style={{ marginBottom: 4 }}>
          <strong>{f.superintendentName}</strong> ({f.projectName}) — {f.categoryName}:{' '}
          <span style={{ color: scoreColor(f.score), fontWeight: 600 }}>{f.score.toFixed(1)}</span>
        </li>
      ))}
    </ul>
  )
}

function FullReportPrint({ weekStart }: { weekStart: string }): JSX.Element | null {
  const { data, isLoading } = useQuery({
    queryKey: ['print-full-report', weekStart],
    queryFn: () => gsApi().getFullReportData(weekStart)
  })

  useEffect(() => {
    if (!isLoading && data) gsApi().notifyPrintReady()
  }, [isLoading, data])

  if (isLoading || !data) return null

  return (
    <PrintLayout>
      <PrintHeading>{data.companyName || 'Company'} — Weekly Field Report</PrintHeading>
      <p style={{ marginTop: 4, color: '#59616b' }}>Prepared by {data.preparedBy || 'GS'}</p>

      <SummaryGrid summary={data.summary} weekStart={data.weekStart} weekEnd={data.weekEnd} />

      <PrintSection title="Escalated Items Needing Leadership Attention">
        <EscalatedList items={data.escalatedItems} />
      </PrintSection>

      <PrintSection title="Red Flags">
        <RedFlagList flags={data.redFlags} />
      </PrintSection>

      <PrintSection title="Walks This Week">
        {data.walks.length === 0 && <p style={{ margin: 0, color: '#838b94' }}>No walks submitted this week.</p>}
        {data.walks.map((w) => (
          <div key={w.walkId} style={{ marginBottom: 16, pageBreakInside: 'avoid' }}>
            <p style={{ margin: '0 0 4px', fontWeight: 600 }}>
              {w.superintendentName} — {w.projectName} ({w.visitType === 'home' ? 'Home' : 'Cross-Project'}) —{' '}
              {w.date}
              {w.overallScore != null && (
                <span style={{ color: scoreColor(w.overallScore) }}> · Overall {w.overallScore.toFixed(1)}</span>
              )}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 6 }}>
              <tbody>
                {w.categoryScores
                  .reduce<Array<(typeof w.categoryScores)[number][]>>((rows, cs, i) => {
                    if (i % 4 === 0) rows.push([])
                    rows[rows.length - 1].push(cs)
                    return rows
                  }, [])
                  .map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cs) => (
                        <td key={cs.categoryId} style={{ padding: '2px 6px', border: '1px solid #eceeef' }}>
                          {cs.categoryName}:{' '}
                          <span style={{ color: scoreColor(cs.average), fontWeight: 600 }}>
                            {cs.average != null ? cs.average.toFixed(1) : '—'}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
            {w.overallNotes && <p style={{ margin: '0 0 2px', fontSize: 11 }}>{w.overallNotes}</p>}
            {w.followupNotes && (
              <p style={{ margin: 0, fontSize: 11, color: '#59616b' }}>Follow-up: {w.followupNotes}</p>
            )}
          </div>
        ))}
      </PrintSection>

      <PrintSection title="Action Items This Week">
        <p style={{ margin: 0 }}>
          Opened: {data.actionItemsOpened} · Closed: {data.actionItemsClosed} · Currently Overdue:{' '}
          {data.actionItemsOverdue}
        </p>
      </PrintSection>

      <PrintSection title="Supers Not Walked This Week">
        {data.supersNotWalked.length === 0 ? (
          <p style={{ margin: 0, color: '#1f9d6c' }}>Everyone was walked this week.</p>
        ) : (
          <p style={{ margin: 0 }}>{data.supersNotWalked.join(', ')}</p>
        )}
      </PrintSection>
    </PrintLayout>
  )
}

function ExecSummaryPrint({ weekStart, selectedNoteIds }: { weekStart: string; selectedNoteIds: string[] }): JSX.Element | null {
  const { data, isLoading } = useQuery({
    queryKey: ['print-exec-report', weekStart, selectedNoteIds],
    queryFn: () => gsApi().getExecSummaryData({ weekStart, selectedNoteIds })
  })

  useEffect(() => {
    if (!isLoading && data) gsApi().notifyPrintReady()
  }, [isLoading, data])

  if (isLoading || !data) return null

  return (
    <PrintLayout>
      <PrintHeading>{data.companyName || 'Company'} — Executive Summary</PrintHeading>
      <p style={{ marginTop: 4, color: '#59616b' }}>Prepared by {data.preparedBy || 'GS'}</p>

      <SummaryGrid summary={data.summary} weekStart={data.weekStart} weekEnd={data.weekEnd} />

      <PrintSection title="Escalations">
        <EscalatedList items={data.escalatedItems} />
      </PrintSection>

      <PrintSection title="Red Flags">
        <RedFlagList flags={data.redFlags} />
      </PrintSection>

      <PrintSection title="Key Notes">
        {data.selectedNotes.length === 0 ? (
          <p style={{ margin: 0, color: '#838b94' }}>No notes selected.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {data.selectedNotes.map((n) => (
              <li key={n.id} style={{ marginBottom: 6 }}>
                <strong>
                  {n.superintendentName} ({n.projectName}
                  {n.categoryName ? ` — ${n.categoryName}` : ''}):
                </strong>{' '}
                {n.text}
              </li>
            ))}
          </ul>
        )}
      </PrintSection>
    </PrintLayout>
  )
}

export function PrintReport(): JSX.Element | null {
  const { type, weekStart } = useParams<{ type: string; weekStart: string }>()
  const [searchParams] = useSearchParams()

  if (!weekStart) return null

  if (type === 'executive') {
    const notesParam = searchParams.get('notes') ?? ''
    const selectedNoteIds = notesParam ? notesParam.split(',').filter(Boolean) : []
    return <ExecSummaryPrint weekStart={weekStart} selectedNoteIds={selectedNoteIds} />
  }

  return <FullReportPrint weekStart={weekStart} />
}
