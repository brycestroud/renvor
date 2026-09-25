import { useQuery } from '@tanstack/react-query'
import { CopyButton } from '../../components/CopyButton'
import { gsApi } from '../../lib/gsApi'

/** The URL + copy button + live status - shared by the MCP tab and the Getting Started tab. */
export function McpConnectBox(): JSX.Element {
  const { data: info, isLoading } = useQuery({
    queryKey: ['mcp-connector-info'],
    queryFn: () => gsApi().getMcpConnectorInfo()
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
    </div>
  )
}
