# Renvor

Local Windows desktop app for a General Superintendent: weekly jobsite walks,
superintendent scoring, action item tracking, and PDF leadership reports.
Runs entirely on one computer — SQLite file on disk, no cloud backend, no
accounts. The only network calls the app ever makes are the optional AI
extraction feature and the future Procore integration; everything else,
including the MCP server, is local.

Status: **Phases 1-10 complete** (Foundation through Polish & Package). See
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
setting, not a project issue. The installer icon (`build/icon.ico`) is
already generated and wired up in `electron-builder.yml`; it just can't be
verified end-to-end (embedded into the actual `.exe`) on this machine until
that setting is on, since even `electron-builder --win --dir` hits the same
symlink block. See `scripts/generate-icon.js` if the icon ever needs
regenerating — it's built entirely from the app's own default brand colors
and an existing `lucide-react` icon, no external image assets.

## Tests

```bash
npm test          # vitest - pure logic: scoring, due-date/frequency, overdue,
                   # report red-flags/stats, legacy-importer parsing, Procore mock
npm run typecheck
npm run test:e2e   # Playwright, against the real built app - run `npm run build` first
```

`test:e2e` runs the spec-mandated smoke test end to end against a scratch,
throwaway database (never your real one): create a project → create a
superintendent → complete and submit a walk → the action item appears on
Action Items → the report shows the walk → PDF export produces a real file
on disk. It drives the actual UI (Playwright's Electron mode), not internal
APIs, so it catches real UI/wiring bugs — it already caught and fixed one:
action items created from Job Walk weren't invalidating the Action Items /
Dashboard cache, so they wouldn't appear there for up to 30 seconds.

## Data & backups

The SQLite database lives in `%APPDATA%\Renvor\gs-dashboard.db` (renamed
from `%APPDATA%\gs-field-ops` after Phase 10 - the app migrates any existing
database from the old folder automatically on first launch under the new
name, copying rather than moving it, so the old folder is left untouched).
Automatic daily + on-quit backups, manual backup/restore, and JSON
export/import are all in Settings > Backup & Data (Phase 7).

## Logs

One file per day in `app.getPath('logs')` (the OS-standard per-app log
folder), covering app startup, uncaught errors, and backup results. Open it
from Settings > About > "Open logs folder" — also shows the app version.

## MCP server (Claude connector)

Full read/write access to the app's data (projects, superintendents,
people, checklist/categories, walks + scores, action items, dashboard and
report data — 52 tools total) for Claude to use directly, instead of the
app calling out to any AI API itself. Never leaves this computer.

**Easiest way to connect (paste a URL):** open the app, go to
Settings > MCP, and copy the URL shown there (something like
`http://127.0.0.1:39212/mcp`). In Claude Desktop: Settings > Connectors >
Add custom connector > paste it in. The Electron app hosts this itself
(an in-process HTTP MCP server, started when the app launches, stopped
when it quits) - no separate process to run, no config file to edit.
Bound to `127.0.0.1` only, with the SDK's DNS-rebinding protection
(Host-header allow-list) on, since this is full read/write access with no
authentication otherwise.

**Alternative (stdio, config-file based):** the Settings > MCP panel also
has a collapsed "prefer a traditional mcpServers config" section with a
ready-to-paste config block, for clients that want a spawned process
instead of a URL. Runs the same 52 tools over stdio via
`scripts/run-mcp.js` (or `npm run mcp` to run it directly) - see that
script's comments for why it launches the Electron binary itself in
`ELECTRON_RUN_AS_NODE=1` mode rather than plain `node`/`tsx`
(`better-sqlite3` here is compiled against Electron's Node ABI, not plain
Node's).

Both transports share one tool set (`src/mcp/tools.ts`) - batch and
composite tools keep either one usage-efficient. A whole walk (header +
every item score + category notes + submit) is one `record_walk` call, not
dozens of `set_item_score` calls; `batch_create_action_items`,
`batch_transition_action_items`, `batch_set_item_scores`, and similar
`batch_*` tools cover the other one-call-per-item cases. Every batch and
composite tool runs inside a single database transaction - one bad item
rolls the whole call back rather than leaving a half-applied walk or
action-item list.

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
                integrations/procore (typed interface + mock client),
                mcp/httpServer.ts (in-process MCP-over-HTTP server)
src/preload     Typed contextBridge — the only thing the renderer can call
src/renderer    React UI
src/shared      Code shared by main/preload/renderer/mcp: scoring, IPC
                contract (zod), seed data, path resolution
src/mcp         MCP tool set (tools.ts, shared by both transports) +
                standalone stdio server (server.ts, built to out/main/mcp.js
                alongside the Electron main process; see MCP section above)
scripts/        run-mcp.js — the ELECTRON_RUN_AS_NODE launcher for src/mcp;
                generate-icon.js — one-time build/icon.ico generator
drizzle/        Generated SQL migrations — do not hand-edit
docs/           PROCORE_INTEGRATION.md — where the real Procore client plugs in
build/          icon.ico / icon.png for electron-builder (installer + window icon)
e2e/            Playwright smoke test (npm run test:e2e) — see Tests above
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
