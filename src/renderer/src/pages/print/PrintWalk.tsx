import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { gsApi } from '../../lib/gsApi'
import { categoryScore } from '@shared/scoring'
import { PrintLayout, PrintHeading, PrintSection, scoreColor } from './PrintLayout'

export function PrintWalk(): JSX.Element | null {
  const { id } = useParams<{ id: string }>()
  const { data: walk, isLoading: walkLoading } = useQuery({
    queryKey: ['print-walk', id],
    queryFn: () => gsApi().getWalk(id!),
    enabled: Boolean(id)
  })
  const { data: categories, isLoading: catLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => gsApi().listCategories()
  })
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => gsApi().getSettings() })

  const ready = !walkLoading && !catLoading && Boolean(walk) && Boolean(categories) && Boolean(settings)

  useEffect(() => {
    if (ready) gsApi().notifyPrintReady()
  }, [ready])

  if (!ready || !walk || !categories || !settings) return null

  const activeCategories = categories.filter((c) => c.active).sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <PrintLayout>
      <PrintHeading>{settings.companyName || 'Company'}</PrintHeading>
      <p style={{ marginTop: 4, color: '#59616b' }}>Job Walk — {walk.date}</p>

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
        <div>
          <strong>Superintendent:</strong> {walk.superintendentName}
        </div>
        <div>
          <strong>Project:</strong> {walk.projectName}
        </div>
        <div>
          <strong>Visit type:</strong> {walk.visitType === 'home' ? 'Home' : 'Cross-Project'}
        </div>
        <div>
          <strong>PM:</strong> {walk.pmNameSnapshot ?? '—'}
        </div>
      </div>

      <PrintSection title="Category Scores">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #d9dddf' }}>Category</th>
              <th style={{ textAlign: 'right', padding: '4px 8px', borderBottom: '1px solid #d9dddf' }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {activeCategories.map((cat) => {
              const entries = cat.items
                .filter((i) => i.active)
                .map((i) => {
                  const s = walk.itemScores.find((sc) => sc.checklistItemId === i.id)
                  return { score: s?.score ?? null, isNa: s?.isNa ?? false }
                })
              const avg = categoryScore(entries)
              return (
                <tr key={cat.id}>
                  <td style={{ padding: '4px 8px', borderBottom: '1px solid #eceeef' }}>{cat.name}</td>
                  <td
                    style={{
                      padding: '4px 8px',
                      borderBottom: '1px solid #eceeef',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: scoreColor(avg)
                    }}
                  >
                    {avg != null ? avg.toFixed(1) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </PrintSection>

      {walk.categoryNotes.filter((n) => n.notes.trim()).length > 0 && (
        <PrintSection title="Category Notes">
          {walk.categoryNotes
            .filter((n) => n.notes.trim())
            .map((n) => {
              const cat = activeCategories.find((c) => c.id === n.categoryId)
              return (
                <p key={n.categoryId} style={{ margin: '0 0 8px' }}>
                  <strong>{cat?.name ?? 'Category'}:</strong> {n.notes}
                </p>
              )
            })}
        </PrintSection>
      )}

      {walk.overallNotes?.trim() && (
        <PrintSection title="Overall Notes">
          <p style={{ margin: 0 }}>{walk.overallNotes}</p>
        </PrintSection>
      )}

      {walk.followupNotes?.trim() && (
        <PrintSection title="Follow-up Items">
          <p style={{ margin: 0 }}>{walk.followupNotes}</p>
        </PrintSection>
      )}
    </PrintLayout>
  )
}
