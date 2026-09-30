import { CheckCircle2, Download, Loader2, AlertCircle } from 'lucide-react'
import { useUpdate } from '../../lib/useUpdate'

/** Settings > About: version, manual check, and the same one-click update as the top bar. */
export function UpdatesCard(): JSX.Element | null {
  const { status, check, checking, update, updating } = useUpdate()
  if (!status) return null

  const busy = checking || ['checking', 'downloading', 'installing'].includes(status.state)

  return (
    <div className="rounded-control border border-border-subtle bg-surface-2 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Updates</p>

      {status.state === 'unsupported' ? (
        <p className="mt-2 text-xs text-text-secondary">
          Updates are delivered to the installed app. This is a development copy, so there&apos;s
          nothing to update here.
        </p>
      ) : (
        <>
          <div className="mt-2 flex items-center gap-2 text-sm text-text-primary">
            {status.state === 'available' || status.state === 'downloaded' ? (
              <>
                <Download size={15} className="text-brand" />
                <span>
                  Version <span className="font-mono">{status.latestVersion}</span> is available
                  (you have <span className="font-mono">{status.currentVersion}</span>)
                </span>
              </>
            ) : status.state === 'downloading' ? (
              <>
                <Loader2 size={15} className="animate-spin text-brand" /> Downloading update{' '}
                {status.percent ?? 0}%
              </>
            ) : status.state === 'installing' ? (
              <>
                <Loader2 size={15} className="animate-spin text-brand" /> Installing - Renvor will
                restart
              </>
            ) : status.state === 'error' ? (
              <>
                <AlertCircle size={15} className="text-danger" />
                <span className="text-danger">Couldn&apos;t check for updates.</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={15} className="text-success" />
                {status.state === 'up-to-date'
                  ? "You're on the latest version."
                  : `You're on version ${status.currentVersion}.`}
              </>
            )}
          </div>

          {status.state === 'error' && status.error && (
            <p className="mt-1 break-words text-xs text-text-muted">{status.error}</p>
          )}
          {status.releaseNotes && (status.state === 'available' || status.state === 'downloaded') && (
            <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-control border border-border-subtle bg-canvas p-3 font-sans text-xs text-text-secondary">
              {status.releaseNotes}
            </pre>
          )}

          <div className="mt-3 flex items-center gap-2">
            {(status.state === 'available' || status.state === 'downloaded') && (
              <button
                onClick={update}
                disabled={updating}
                className="rounded-control bg-brand px-4 py-2 text-sm font-medium text-[#171200] transition-colors hover:bg-brand-hover disabled:opacity-60"
              >
                {status.state === 'downloaded' ? 'Restart to update' : `Update to v${status.latestVersion}`}
              </button>
            )}
            <button
              onClick={check}
              disabled={busy}
              className="rounded-control border border-border bg-surface-1 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-60"
            >
              {busy && status.state === 'checking' ? 'Checking…' : 'Check for updates'}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-text-muted">
            Updating downloads the new version, backs up your data, and restarts Renvor. Your
            projects, walks, and settings are kept.
          </p>
        </>
      )}
    </div>
  )
}
