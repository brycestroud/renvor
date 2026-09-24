import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'

export function PlaceholderPage({
  title,
  icon,
  phase
}: {
  title: string
  icon: LucideIcon
  phase: string
}): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} />
      <EmptyState
        icon={icon}
        title="Not built yet"
        description={`${title} lands in ${phase}. This screen will replace this placeholder once that phase ships.`}
      />
    </div>
  )
}
