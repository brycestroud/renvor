import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Copy, ChevronDown, ChevronUp } from 'lucide-react'
import { gsApi } from '../../lib/gsApi'

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }): JSX.Element {
  const [copied, setCopied] = useState(false)

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard permission denied or unavailable - the text is still
      // right there on screen to select and copy by hand.
    }
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 rounded-control border border-border bg-surface-1 px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-hover"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied' : label}
    </button>
  )
}

export function McpPanel(): JSX.Element {
  const { data: info, isLoading } = useQuery({
    queryKey: ['mcp-connector-info'],
    queryFn: () => gsApi().getMcpConnectorInfo()
  })
  const [showStdio, setShowStdio] = useState(false)

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">MCP</h2>
        <p className="mt-1 text-xs text-text-muted">
          Full read/write access to this app&apos;s data (projects, superintendents, walks, action
          items, reports) for Claude to use directly - no API key, no cloud AI calls from this app.
          It runs locally on this computer only and reads/writes the same database file the app
          uses.
        </p>
      </div>

      <div className="rounded-control border border-border-subtle bg-surface-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Connect Claude Desktop
        </p>
        <p className="mt-1.5 text-xs text-text-secondary">
          Claude Desktop &gt; Settings &gt; Connectors &gt; Add custom connector &gt; paste this
          URL.
        </p>

        {isLoading && <p className="mt-3 text-sm text-text-muted">Loading…</p>}

        {info && (
          <>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-control border border-border-subtle bg-canvas px-3 py-2.5 font-mono text-sm text-text-primary">
                {info.url}
              </code>
              <CopyButton text={info.url} label="Copy URL" />
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span
                className={`h-1.5 w-1.5 rounded-full ${info.httpServerRunning ? 'bg-success' : 'bg-danger'}`}
              />
              <span className={info.httpServerRunning ? 'text-text-muted' : 'text-danger'}>
                {info.httpServerRunning
                  ? 'Running - only reachable while this app is open.'
                  : (info.httpServerError ?? 'Not running.')}
              </span>
            </div>
          </>
        )}
      </div>

      <div>
        <button
          onClick={() => setShowStdio(!showStdio)}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary"
        >
          {showStdio ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          Prefer a traditional mcpServers config instead?
        </button>
        {showStdio && info && (
          <div className="mt-2 rounded-control border border-border-subtle bg-surface-2 p-4">
            <p className="text-xs text-text-secondary">
              For clients that use a config file (e.g. Claude Desktop&apos;s Developer &gt; Edit
              Config) instead of a pasted URL. Runs the same tools over stdio instead of HTTP.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-control border border-border-subtle bg-canvas p-3 font-mono text-xs text-text-primary">
              {info.stdioConfigSnippet}
            </pre>
            <div className="mt-2">
              <CopyButton text={info.stdioConfigSnippet} label="Copy config" />
            </div>
            <p className="mt-3 text-[11px] text-text-muted">
              This points at this computer&apos;s copy of the app running from source. A packaged
              install doesn&apos;t ship this yet - the URL above works either way.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
