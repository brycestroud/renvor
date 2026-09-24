import { Plug } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'

export function Procore(): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Procore" />
      <EmptyState
        icon={Plug}
        title="Procore integration — coming soon"
        description="Daily logs, observations and inspections will surface here once connected. Nothing is wired up yet — this is a placeholder per the build spec (Phase 9)."
        action={
          <button
            disabled
            className="cursor-not-allowed rounded-control border border-border-strong bg-surface-2 px-4 py-2 text-sm text-text-disabled"
          >
            Connect
          </button>
        }
      />
    </div>
  )
}
