import { CheckCircle2, AlertCircle } from 'lucide-react'

export function TopBar({
  pageLabel,
  lastBackupAt
}: {
  pageLabel: string
  lastBackupAt: string | null
}): JSX.Element {
  return (
    <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-border bg-canvas px-5">
      <span className="text-sm text-text-secondary">{pageLabel}</span>
      <div className="flex items-center gap-2 text-xs text-text-muted">
        {lastBackupAt ? (
          <>
            <CheckCircle2 size={14} className="text-success" />
            <span>
              Last backup{' '}
              {new Date(lastBackupAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </>
        ) : (
          <>
            <AlertCircle size={14} className="text-warning" />
            <span>No backup yet</span>
          </>
        )}
      </div>
    </header>
  )
}
