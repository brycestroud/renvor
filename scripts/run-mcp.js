// Launches the MCP server (src/mcp/server.ts, built to out/main/mcp.js).
//
// Why this wrapper exists instead of `node out/main/mcp.js` or `tsx
// src/mcp/server.ts` directly: better-sqlite3 in this project is compiled
// against Electron's Node ABI (see package.json's postinstall), not plain
// Node's. Loading it from plain Node throws a NODE_MODULE_VERSION mismatch.
// Running the Electron binary itself with ELECTRON_RUN_AS_NODE=1 gives a
// plain-Node-like process that can still load that same binary, so this
// spawns Electron in that mode instead of a real Node process.
//
// This is also the exact command a Claude Desktop / Claude connector config
// should point at: `node scripts/run-mcp.js` (see README's MCP section).
const { spawnSync } = require('child_process')
const { existsSync } = require('fs')
const { join } = require('path')

const electronBinary = require('electron')
const entry = join(__dirname, '..', 'out', 'main', 'mcp.js')

if (!existsSync(entry)) {
  console.error(
    `MCP server entry not found at ${entry}.\nRun "npm run build" first (this only needs to be redone after pulling code changes, not on every launch).`
  )
  process.exit(1)
}

const result = spawnSync(electronBinary, [entry], {
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
})

process.exit(result.status ?? 1)
