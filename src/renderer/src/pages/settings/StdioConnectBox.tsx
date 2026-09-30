import { useQuery } from '@tanstack/react-query'
import { CopyButton } from '../../components/CopyButton'
import { gsApi } from '../../lib/gsApi'

/**
 * The stdio mcpServers config - the setup method that actually works with
 * Claude Desktop (see httpServer.ts's file header for why the pasted-URL
 * method never can). Shared by the MCP tab and the Getting Started tab.
 */
export function StdioConnectBox(): JSX.Element {
  const { data: info, isLoading } = useQuery({
    queryKey: ['mcp-connector-info'],
    queryFn: () => gsApi().getMcpConnectorInfo()
  })

  if (isLoading) return <p className="text-sm text-text-muted">Loading…</p>
  if (!info) return <p className="text-sm text-danger">Couldn&apos;t load connector info.</p>

  return (
    <div>
      <ol className="list-inside list-decimal space-y-2 text-xs text-text-secondary">
        <li>
          Fully quit Claude Desktop first - closing the window alone leaves it running in the
          background. Right-click its icon in the system tray (bottom-right of the taskbar) and
          choose <span className="font-semibold text-text-primary">Quit</span>.
        </li>
        <li>
          Open its config folder and find (or create){' '}
          <code className="rounded bg-canvas px-1 py-0.5 font-mono text-[11px]">
            claude_desktop_config.json
          </code>
          . Open it in Notepad (or any text editor).
          <div className="mt-1.5">
            <OpenConfigFolderButton />
          </div>
        </li>
        <li>
          Paste the block below. If the file already has content with its own{' '}
          <code className="rounded bg-canvas px-1 py-0.5 font-mono text-[11px]">
            &quot;mcpServers&quot;
          </code>{' '}
          section, add just the{' '}
          <code className="rounded bg-canvas px-1 py-0.5 font-mono text-[11px]">
            &quot;renvor&quot;
          </code>{' '}
          entry inside it instead of replacing the whole file.
        </li>
        <li>Save the file, then open Claude Desktop again.</li>
        <li>
          Confirm it worked: in a chat, the tools/connectors icon should list{' '}
          <span className="font-semibold text-text-primary">renvor</span> with its tools
          available.
        </li>
      </ol>

      <pre className="mt-3 overflow-x-auto rounded-control border border-border-subtle bg-canvas p-3 font-mono text-xs text-text-primary">
        {info.stdioConfigSnippet}
      </pre>
      <div className="mt-2">
        <CopyButton text={info.stdioConfigSnippet} label="Copy config" />
      </div>
      <p className="mt-3 text-[11px] text-text-muted">
        <span className="font-semibold text-text-primary">command</span> points at this copy of
        Renvor itself (not a system Node.js install), re-launched in a mode that lets it read the
        same database file the app uses. It only works while Renvor is open, same as the app
        itself.
      </p>
    </div>
  )
}

function OpenConfigFolderButton(): JSX.Element {
  return (
    <button
      onClick={() => gsApi().openClaudeConfigFolder()}
      className="rounded-control border border-border bg-surface-1 px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-hover"
    >
      Open Claude config folder
    </button>
  )
}
