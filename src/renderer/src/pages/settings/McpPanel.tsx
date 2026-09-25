import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Copy } from 'lucide-react'
import { gsApi } from '../../lib/gsApi'

export function McpPanel(): JSX.Element {
  const { data: info, isLoading } = useQuery({
    queryKey: ['mcp-connector-info'],
    queryFn: () => gsApi().getMcpConnectorInfo()
  })
  const [copied, setCopied] = useState(false)

  async function copyConfig(): Promise<void> {
    if (!info) return
    try {
      await navigator.clipboard.writeText(info.configSnippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard permission denied or unavailable - the snippet is still
      // right there to select and copy by hand.
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">MCP</h2>
        <p className="mt-1 text-xs text-text-muted">
          Full read/write access to this app&apos;s data (projects, superintendents, walks, action
          items, reports) for Claude to use directly - no API key, no cloud AI calls from this app.
          It&apos;s a local process that talks to Claude over stdio and reads/writes the same
          database file the app uses.
        </p>
      </div>

      <div className="rounded-control border border-border-subtle bg-surface-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Connect Claude Desktop
        </p>
        <p className="mt-1.5 text-xs text-text-secondary">
          Add this to Claude Desktop&apos;s config (Settings &gt; Developer &gt; Edit Config), then
          restart Claude Desktop.
        </p>

        {isLoading && <p className="mt-3 text-sm text-text-muted">Loading…</p>}

        {info && (
          <>
            <pre className="mt-3 overflow-x-auto rounded-control border border-border-subtle bg-canvas p-3 font-mono text-xs text-text-primary">
              {info.configSnippet}
            </pre>
            <button
              onClick={copyConfig}
              className="mt-2 flex items-center gap-1.5 rounded-control border border-border bg-surface-1 px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-hover"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy config'}
            </button>
          </>
        )}

        <p className="mt-3 text-[11px] text-text-muted">
          This points at this computer&apos;s copy of the app running from source - it launches
          the same MCP server this app itself can run via <code>npm run mcp</code>. A packaged
          install doesn&apos;t ship this yet.
        </p>
      </div>
    </div>
  )
}
