import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../components/PageHeader'
import { gsApi } from '../lib/gsApi'

export function DebugSeed(): JSX.Element {
  const { data, isLoading, error } = useQuery({
    queryKey: ['debug-seed'],
    queryFn: () => gsApi().getSeedSnapshot()
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Debug — Seed Data"
        subtitle="Temporary Phase 1 verification screen. Confirms categories + checklist items seeded correctly from Appendix A."
      />

      {isLoading && <p className="text-sm text-text-muted">Loading…</p>}
      {error && <p className="text-sm text-danger">Failed to load: {String(error)}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {data?.map((cat) => (
          <div key={cat.id} className="rounded-panel border border-border-subtle bg-surface-1 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">{cat.name}</h3>
              <span className="font-mono text-xs text-text-muted">
                {cat.isGsOnly ? 'GS-only' : `weight ${cat.weight}`}
              </span>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5">
              {cat.items.map((item) => (
                <li key={item.id} className="text-xs text-text-secondary">
                  <span className="font-mono text-text-muted">{item.frequency}</span> — {item.text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {data && (
        <p className="text-xs text-text-muted">
          {data.length} categories, {data.reduce((acc, c) => acc + c.items.length, 0)} checklist
          items total.
        </p>
      )}
    </div>
  )
}
