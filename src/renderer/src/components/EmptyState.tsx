import type { LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 rounded-panel border border-border-subtle bg-surface-1 px-6 py-14 text-center">
      <Icon size={22} strokeWidth={1.75} className="text-text-muted" />
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>
      </div>
      {action}
    </div>
  )
}
