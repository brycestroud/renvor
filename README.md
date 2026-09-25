# GS Field Operations

Local Windows desktop app for a General Superintendent: weekly jobsite walks,
superintendent scoring, action item tracking, and PDF leadership reports.
Runs entirely on one computer — SQLite file on disk, no cloud backend, no
accounts. The only network calls the app ever makes are the optional AI
extraction feature and the future Procore integration; everything else,
including the MCP server, is local.

Status: **Phases 1-9 complete** (Foundation through Procore scaffolding). See
`CHANGELOG.md` for what's built so far and the build spec for the full phase
plan.

## Install (development)

Requires Node.js 20+ and npm.

```bash
npm install
```

`postinstall` runs `electron-rebuild` automatically to rebuild `better-sqlite3`
against Electron's Node ABI. If you hit a "Could not find Visual Studio" error
during a *fresh* install on a machine with no prebuilt binary available for
your Electron version, see **Troubleshooting** below — you almost never need
Visual Studio Build Tools for this project.

## Run in development

```bash
npm run dev
```

Opens the app with hot reload. On first launch you'll see the onboarding
screen — nothing is pre-filled or hardcoded (company name, your name, colors
all get set there and are editable later in Settings).

## Build

```bash
npm run build       # type-checks + builds main/preload/renderer to out/
npm run build:win   # also packages a Windows NSIS installer to release/
```

`build:win` requires Windows "Developer Mode" enabled (Settings > Privacy &
Security > For developers) or an elevated terminal — electron-builder needs
to extract a signing-tools archive that uses symlinks, and creating symlinks
without one of those two is blocked by Windows. This is a one-time machine
setting, not a project issue.

## Tests

```bash
npm test          # vitest (scoring, due-date, overdue logic)
npm run typecheck
```

## Data & backups

The SQLite database lives in `%APPDATA%\gs-field-ops\gs-dashboard.db`.
Automatic daily + on-quit backups, manual backup/restore, and JSON
export/import are all in Settings > Backup & Data (Phase 7).

## MCP server (Claude connector)

Full read/write access to the app's data (projects, superintendents,
people, checklist/categories, walks + scores, action items, dashboard and
report data — 52 tools total) for Claude to use directly, instead of the
app calling out to any AI API itself. No network involved: it's a local
stdio process reading/writing the exact same SQLite file (WAL mode) the
Electron app uses, so both can run at once.

Batch and composite tools keep this usage-efficient — a whole walk (header
+ every item score + category notes + submit) is one `record_walk` call,
not dozens of `set_item_score` calls; `batch_create_action_items`,
`batch_transition_action_items`, `batch_set_item_scores`, and similar
`batch_*` tools cover the other one-call-per-item cases (creating/
archiving/deleting many projects, superintendents, people, checklist
items, action items, or walks at once). Every batch and composite tool
runs inside a single database transaction — one bad item rolls the whole
call back rather than leaving a half-applied walk or action-item list.

Run it directly with:

```bash
npm run build   # only needed after pulling code changes, not every launch
npm run mcp
```

To add it as a connector, point your MCP client at:

- **Command:** `node`
- **Args:** `["<full path to this repo>\\scripts\\run-mcp.js"]`

**Why not just `node out/main/mcp.js` or `tsx src/mcp/server.ts` directly:**
`better-sqlite3` here is compiled against Electron's Node ABI (see
`postinstall` above), not plain Node's — loading it from real Node throws a
`NODE_MODULE_VERSION` mismatch. `scripts/run-mcp.js` launches the Electron
binary itself in `ELECTRON_RUN_AS_NODE=1` mode instead, which can load that
same binary while behaving like a plain Node process otherwise.

Settings (company name, brand colors, etc.) are exposed read-only over MCP
— changing those stays a Settings-UI action, not something done mid-chat.
Action items created via MCP use `source: "mcp"` so their origin is honest
in the UI rather than looking hand-entered.

## Procore (scaffolding only, mock data)

No real Procore connection exists yet — this is intentionally scaffolding
per the build spec's Section 7 ("don't build the integration yet"). Turn on
"Preview with mock data" on the Procore page (`settings.procoreEnabled`) to
see the Procore-shaped UI (a "Procore this week" panel on Job Walk, "Import
from Procore" on Action Items, and Procore ID fields on Project/
Superintendent forms) render against realistic fake data instead of a real
API. See `docs/PROCORE_INTEGRATION.md` for exactly where a real client,
OAuth flow, and credential storage plug in later.

## Project layout

```
src/main        Electron main process: db, IPC handlers, migrations, seed,
                integrations/procore (typed interface + mock client)
src/preload     Typed contextBridge — the only thing the renderer can call
src/renderer    React UI
src/shared      Code shared by main/preload/renderer/mcp: scoring, IPC
                contract (zod), seed data, path resolution
src/mcp         Standalone MCP server (built to out/main/mcp.js alongside
                the Electron main process; see MCP section above)
scripts/        run-mcp.js — the ELECTRON_RUN_AS_NODE launcher for src/mcp
drizzle/        Generated SQL migrations — do not hand-edit
docs/           PROCORE_INTEGRATION.md — where the real Procore client plugs in
```

## Troubleshooting

**`better-sqlite3` fails to build from source / "Could not find Visual
Studio"**: this means npm tried to compile it against your system Node
version instead of Electron's. Don't install Visual Studio Build Tools for
this — instead run:

```bash
npm install better-sqlite3 --ignore-scripts
npx electron-rebuild -f -w better-sqlite3
```

This rebuilds against Electron's own ABI, which has a prebuilt binary
published — no C++ toolchain needed. `postinstall` does this automatically
on a normal `npm install`, so this is only for recovering a broken install.

**Electron window opens but stays blank / dev server shows nothing**: open
DevTools (auto-opens in dev) and check the Console tab first. The two bugs
we hit building this: (1) preload script needs to be fully bundled, not
externalized — `sandbox: true` means preload can't `require()` node_modules
at runtime; (2) the strict CSP is dev-mode-disabled on purpose because Vite's
React Refresh injects an inline script the CSP would block.
