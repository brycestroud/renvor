/**
 * Standalone MCP server (stdio transport) - the "full read/write" Claude
 * Desktop connector from the Phase 1 answer, for a traditional mcpServers
 * config entry. Runs as its own local process, reads/writes the exact same
 * SQLite file (WAL mode) the Electron app uses, and never talks to a
 * network - this is a local pipe between Claude and the on-disk data, not
 * an AI-extraction feature calling out to an API.
 *
 * Must be launched via `npm run mcp` (see scripts/run-mcp.js), NOT plain
 * `node`/`tsx`: better-sqlite3 here is compiled against Electron's Node ABI
 * (see package.json postinstall), so this process needs to actually be the
 * Electron binary running in ELECTRON_RUN_AS_NODE mode to load it.
 *
 * The actual tool set lives in src/mcp/tools.ts, shared with the in-process
 * HTTP server the Electron app hosts (src/main/mcp/httpServer.ts) for the
 * paste-a-URL-into-Claude-Desktop connector method.
 */
import { join } from 'path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { runMigrations } from '@main/db/migrate'
import { migrateLegacyAppDataDirIfNeeded } from '@shared/paths'
import { registerMcpTools } from './tools'

async function main(): Promise<void> {
  migrateLegacyAppDataDirIfNeeded()
  runMigrations(join(__dirname, '../../drizzle'))

  const server = new McpServer({ name: 'renvor', version: '1.0.0' })
  registerMcpTools(server)

  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Renvor MCP server ready (stdio).')
}

main().catch((error) => {
  console.error('MCP server error:', error)
  process.exit(1)
})
