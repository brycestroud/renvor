import { CheckCircle2, AlertCircle } from 'lucide-react'
import { UpdateButton } from './UpdateButton'
import { isRemote } from '../lib/gsApi'

export function TopBar({
  pageLabel,
  companyName,
  lastBackupAt
}: {
  pageLabel: string
  companyName: string
  lastBackupAt: string | null
}): JSX.Element {
  return (
    <header className="flex h-[44px] shrink-0 md:h-[56px] items-center justify-between border-b border-border bg-canvas px-4 md:px-5">
      <span className="truncate text-sm text-text-secondary">
        <span className="md:hidden">{companyName || 'Renvor'}</span>
        <span className="hidden md:inline">{pageLabel}</span>
      </span>
      {!isRemote && <UpdateButton />}
      <div className="hidden items-center gap-2 text-xs text-text-muted sm:flex">
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
