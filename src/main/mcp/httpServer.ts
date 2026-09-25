/**
 * In-process MCP-over-HTTP server the Electron app hosts itself, purely so
 * connecting Claude Desktop is "paste a URL into Custom Connectors" instead
 * of hand-editing claude_desktop_config.json. Same tool set as the stdio
 * server (src/mcp/tools.ts) - this is a second transport, not a second
 * feature set.
 *
 * Runs INSIDE the already-running Electron main process (unlike the stdio
 * server, which needs its own ELECTRON_RUN_AS_NODE-launched process to load
 * better-sqlite3's Electron-ABI binary) - no separate process, no ABI
 * concerns, since it's the exact same process already using getDb() for
 * everything else.
 *
 * Security: bound to 127.0.0.1 only (never 0.0.0.0 - this is full read/write
 * access to the app's data with no authentication, so it must never be
 * reachable from the network), plus the SDK's own DNS-rebinding protection
 * (Host header allow-list) to block a malicious webpage open in any browser
 * on this machine from being able to fetch() this endpoint via a spoofed
 * Host header.
 *
 * HTTPS, not HTTP: Claude Desktop's custom connector requires an https://
 * URL. There's no real CA that issues certs for 127.0.0.1, so this uses a
 * self-signed one (cert.ts) covering localhost/127.0.0.1 - Claude Desktop
 * (or any client) may still warn about or refuse an untrusted certificate;
 * that's a client-side trust decision this server can't make for it.
 */
import { createServer, type Server } from 'https'
import { randomUUID } from 'crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { registerMcpTools } from '../../mcp/tools'
import { getOrCreateMcpCert } from './cert'
import { logInfo, logError } from '../logger'

const HOST = '127.0.0.1'
const PORT = 39212

export function getMcpHttpUrl(): string {
  return `https://${HOST}:${PORT}/mcp`
}

let httpServer: Server | null = null
let status: { running: boolean; error: string | null } = { running: false, error: null }

export function getMcpHttpStatus(): { running: boolean; error: string | null } {
  return status
}

export async function startMcpHttpServer(): Promise<{ ok: true } | { ok: false; error: string }> {
  const mcpServer = new McpServer({ name: 'renvor', version: '1.0.0' })
  registerMcpTools(mcpServer)

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    enableDnsRebindingProtection: true,
    allowedHosts: [`localhost:${PORT}`, `127.0.0.1:${PORT}`]
  })
  await mcpServer.connect(transport)

  const { key, cert } = await getOrCreateMcpCert()

  return new Promise((resolve) => {
    const server = createServer({ key, cert }, (req, res) => {
      if (!req.url || !req.url.startsWith('/mcp')) {
        res.writeHead(404).end()
        return
      }
      transport.handleRequest(req, res).catch((error) => {
        logError('MCP HTTP request failed', error)
        if (!res.headersSent) res.writeHead(500).end()
      })
    })

    server.once('error', (error: NodeJS.ErrnoException) => {
      const message =
        error.code === 'EADDRINUSE'
          ? `Port ${PORT} is already in use (by another app, or another copy of Renvor already running).`
          : error.message
      logError('MCP HTTP server failed to start', error)
      status = { running: false, error: message }
      resolve({ ok: false, error: message })
    })

    server.listen(PORT, HOST, () => {
      httpServer = server
      status = { running: true, error: null }
      logInfo(`MCP HTTP server listening at ${getMcpHttpUrl()}`)
      resolve({ ok: true })
    })
  })
}

export function stopMcpHttpServer(): void {
  httpServer?.close()
  httpServer = null
}
