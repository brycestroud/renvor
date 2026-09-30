import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { StdioConnectBox } from './StdioConnectBox'
import { McpConnectBox } from './McpConnectBox'

export function McpPanel(): JSX.Element {
  const [showUrlMethod, setShowUrlMethod] = useState(false)

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
        <div className="mt-3">
          <StdioConnectBox />
        </div>
      </div>

      <div>
        <button
          onClick={() => setShowUrlMethod(!showUrlMethod)}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary"
        >
          {showUrlMethod ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          Using a different MCP client (not Claude Desktop)?
        </button>
        {showUrlMethod && (
          <div className="mt-2 rounded-control border border-border-subtle bg-surface-2 p-4">
            <p className="text-xs text-text-secondary">
              Some MCP clients connect directly to a URL instead of a config file. This{' '}
              <span className="font-semibold text-text-primary">doesn&apos;t work with Claude
              Desktop specifically</span> - its &quot;Add custom connector&quot; dialog checks
              reachability from Anthropic&apos;s own servers, which can never reach a URL on this
              computer. Use the config method above for Claude Desktop.
            </p>
            <div className="mt-3">
              <McpConnectBox />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
