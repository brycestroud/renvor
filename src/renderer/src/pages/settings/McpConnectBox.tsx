import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { CopyButton } from '../../components/CopyButton'
import { gsApi } from '../../lib/gsApi'

/**
 * The URL + copy button + live status, for MCP clients that connect
 * directly to a URL (NOT Claude Desktop - see StdioConnectBox for that).
 */
export function McpConnectBox(): JSX.Element {
  const queryClient = useQueryClient()
  const { data: info, isLoading } = useQuery({
    queryKey: ['mcp-connector-info'],
    queryFn: () => gsApi().getMcpConnectorInfo()
  })

  const openCert = useMutation({
    mutationFn: () => gsApi().openMcpCertFile(),
    onSuccess: () => {
      // Trusting the cert happens outside the app (Windows' own wizard) -
      // recheck once they've had a moment to click through it.
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['mcp-connector-info'] }), 3000)
    }
  })

  if (isLoading) return <p className="text-sm text-text-muted">Loading…</p>
  if (!info) return <p className="text-sm text-danger">Couldn&apos;t load connector info.</p>

  return (
    <div>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-control border border-border-subtle bg-canvas px-3 py-2.5 font-mono text-sm text-text-primary">
          {info.url}
        </code>
        <CopyButton text={info.url} label="Copy URL" />
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs">
        <span className={`h-1.5 w-1.5 rounded-full ${info.httpServerRunning ? 'bg-success' : 'bg-danger'}`} />
        <span className={info.httpServerRunning ? 'text-text-muted' : 'text-danger'}>
          {info.httpServerRunning
            ? 'Running - only reachable while this app is open.'
            : (info.httpServerError ?? 'Not running.')}
        </span>
      </div>

      {info.httpServerRunning && (
        <div
          className={`mt-3 rounded-control border p-3 text-xs ${
            info.certTrusted
              ? 'border-success-muted bg-success-muted text-success'
              : 'border-warning-muted bg-warning-muted text-warning'
          }`}
        >
          {info.certTrusted ? (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={13} /> Certificate trusted - the URL above will work in Claude
              Desktop.
            </span>
          ) : (
            <div>
              <p className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle size={13} /> One-time step needed first
              </p>
              <p className="mt-1 text-text-secondary">
                Claude Desktop will say &quot;couldn&apos;t reach this address&quot; until this
                computer trusts this app&apos;s certificate. This is normal for a local server -
                there&apos;s no public authority that issues certificates for 127.0.0.1. It only
                needs doing once, ever, on this computer.
              </p>
              <ol className="mt-2 list-inside list-decimal space-y-1 text-text-secondary">
                <li>
                  Click <span className="font-semibold text-text-primary">Open certificate</span>{' '}
                  below.
                </li>
                <li>
                  In the window that opens, click{' '}
                  <span className="font-semibold text-text-primary">Install Certificate…</span>
                </li>
                <li>
                  Choose <span className="font-semibold text-text-primary">Current User</span>{' '}
                  (not Local Machine - no admin needed), then Next.
                </li>
                <li>
                  Choose{' '}
                  <span className="font-semibold text-text-primary">
                    Place all certificates in the following store
                  </span>{' '}
                  → Browse →{' '}
                  <span className="font-semibold text-text-primary">
                    Trusted Root Certification Authorities
                  </span>{' '}
                  → OK → Next → Finish.
                </li>
                <li>
                  Click <span className="font-semibold text-text-primary">Yes</span> on Windows&apos;
                  security warning - it&apos;s specific to this app&apos;s local server, not a
                  general certificate.
                </li>
              </ol>
              <button
                onClick={() => openCert.mutate()}
                disabled={openCert.isPending}
                className="mt-3 rounded-control border border-border bg-surface-1 px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-hover disabled:opacity-60"
              >
                {openCert.isPending ? 'Opening…' : 'Open certificate'}
              </button>
              {openCert.data && !openCert.data.success && (
                <p className="mt-1.5 text-danger">{openCert.data.error}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
