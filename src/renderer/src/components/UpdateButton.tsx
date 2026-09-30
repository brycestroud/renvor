import { Download, Loader2, AlertCircle } from 'lucide-react'
import { useUpdate } from '../lib/useUpdate'

/** Top-bar update button: only appears when there's something to act on. */
export function UpdateButton(): JSX.Element | null {
  const { status, update, updating } = useUpdate()
  if (!status) return null

  if (status.state === 'available' || status.state === 'downloaded') {
    return (
      <button
        onClick={update}
        disabled={updating}
        title={status.releaseNotes ?? undefined}
        className="flex items-center gap-1.5 rounded-control bg-brand px-3 py-1.5 text-xs font-medium text-[#171200] transition-colors hover:bg-brand-hover disabled:opacity-60"
      >
        <Download size={13} />
        {status.state === 'downloaded' ? 'Restart to update' : `Update to v${status.latestVersion}`}
      </button>
    )
  }

  if (status.state === 'downloading') {
    return (
      <span className="flex items-center gap-1.5 rounded-control border border-brand-border bg-brand-muted px-3 py-1.5 text-xs text-brand">
        <Loader2 size={13} className="animate-spin" /> Downloading update {status.percent ?? 0}%
      </span>
    )
  }

  if (status.state === 'installing') {
    return (
      <span className="flex items-center gap-1.5 rounded-control border border-brand-border bg-brand-muted px-3 py-1.5 text-xs text-brand">
        <Loader2 size={13} className="animate-spin" /> Installing - Renvor will restart
      </span>
    )
  }

  // A failure after an update was already found (not a quiet background check).
  if (status.state === 'error' && status.latestVersion) {
    return (
      <button
        onClick={update}
        title={status.error ?? undefined}
        className="flex items-center gap-1.5 rounded-control border border-danger bg-danger-muted px-3 py-1.5 text-xs text-danger"
      >
        <AlertCircle size={13} /> Update failed - retry
      </button>
    )
  }

  return null
}
