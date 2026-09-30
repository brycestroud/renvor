# Renvor

Local Windows desktop app for a General Superintendent: weekly jobsite walks,
superintendent scoring, action item tracking, and PDF leadership reports.
Runs entirely on one computer — SQLite file on disk, no cloud backend, no
accounts. The only network calls the app ever makes are the optional AI
extraction feature and the future Procore integration; everything else,
including the MCP server, is local.

Status: **Phases 1-10 complete, plus phone app + customize** (Foundation through Polish & Package). See
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

`build:win` (which also stages the editable source bundle the installer
ships - `scripts/prepare-source-bundle.js`) needs Windows "Developer Mode"
enabled (Settings > System > For developers) or an elevated terminal:
electron-builder unpacks a signing-tools archive containing symlinks, and
Windows blocks creating symlinks without one of those two. One-time machine
setting, not a project issue. Without it you can still produce a working
**test** installer with
`npx electron-builder --win -c.win.signAndEditExecutable=false`, but that
skips embedding the icon/version into `Renvor.exe` (shortcuts show the
default Electron icon), so don't ship that one. GitHub Actions runners
allow symlinks, so the release workflow below produces the fully branded
installer regardless. See `scripts/generate-icon.js` if the icon needs
regenerating.

## Releasing an update

Installed copies check GitHub Releases (on startup and every 6 hours, plus
Settings > About > Check for updates) and show an **Update to vX.Y.Z**
button in the top bar. One click downloads it, backs up the data, installs
silently and relaunches; nothing installs without that click. (electron-
updater; `src/main/updater.ts`.)

1. Once: set `publish.owner` / `publish.repo` in `electron-builder.yml` to
   your real GitHub repo (it's a placeholder now - updates can't work until
   this is real), and make the repo public (or the app can't read releases).
2. Bump `"version"` in `package.json` (e.g. `0.2.0`), commit, push.
3. Tag and push: `git tag v0.2.0 && git push origin v0.2.0`.
   `.github/workflows/release.yml` verifies the tag matches `package.json`,
   runs typecheck + tests, builds the installer, and publishes a GitHub
   Release with `Renvor-Setup-0.2.0.exe`, its `.blockmap` and `latest.yml`.
   Anyone running an older install sees the button.
4. Your website can link to the latest installer at
   `https://github.com/OWNER/REPO/releases/latest`.

Release notes shown in the app come from the GitHub Release description.
The installer is **not code-signed**, so Windows SmartScreen will say
"unknown publisher" on first install until you buy a code-signing
certificate (electron-builder picks one up from `CSC_LINK`/`CSC_KEY_PASSWORD`
with no code change). Updates themselves still work unsigned.

Test hooks (used by the automated checks, harmless otherwise):
`RENVOR_UPDATE_FEED_URL` points the updater at a local feed;
`RENVOR_PHONE_PORT` moves the phone server off 39213.

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

**Setup (Claude Desktop): paste a config, not a URL.** Settings > MCP (or
Getting Started) has the exact steps and a ready-to-copy `mcpServers`
block, plus an "Open Claude config folder" button. `command` points at
this copy of Renvor's own executable, re-launched in
`ELECTRON_RUN_AS_NODE=1` mode (generated fresh by the app each time, from
`process.execPath` — works for a packaged install too, no separate Node.js
install required on the user's machine) — not `node scripts/run-mcp.js`,
which needed a system Node.js and only worked from a source checkout.
Verified end to end: a real MCP SDK client spawned with the exact
generated command/args/env connects, lists all 52 tools, and successfully
calls one.

Claude Desktop's own **"Add custom connector" paste-a-URL flow does not
work for this** and never will, regardless of certs or CORS — its
reachability check runs from Anthropic's own servers, not this machine, so
`127.0.0.1`/`localhost` can never resolve to anything reachable. Confirmed
by diagnostic request logging (zero requests from Claude Desktop ever hit
the local server across repeated retries) and by
[Anthropic's own tracked issue](https://github.com/anthropics/claude-ai-mcp/issues/917)
and [connector docs](https://support.claude.com/en/articles/11175166). An
in-process HTTPS MCP server (`src/main/mcp/httpServer.ts`, self-signed
cert, bound to `127.0.0.1` only, DNS-rebinding protection on) still runs
and is exposed as a secondary, collapsed option in Settings > MCP, for
other MCP clients whose connector flow genuinely does connect straight to
a local URL rather than routing reachability checks through a cloud hop.

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

## Phone app (Settings > Phone App)

Off until turned on. Renvor then runs a small web server on this computer
(port 39213, `src/main/phone/phoneServer.ts`) that serves the same built UI
and runs the **same handlers** as Electron IPC (`registerIpc.ts` records every
handler in a registry; the phone's `POST /app/<token>/api/invoke` calls that
registry) - so the phone reads and writes the one database on this computer,
live, with no sync layer. The screen-to-backend method list lives in one
place (`src/shared/apiBridge.ts`), wired to `ipcRenderer` by the preload and
to `fetch` by `lib/gsApi.ts` when there's no preload (the phone).

- **Anywhere access via Tailscale (the primary path):** the server listens on
  all interfaces, so once Tailscale (free) is on this PC and the phone, the
  same link works from any network. The setup UI walks through installing
  Tailscale on both devices (with live detection of this PC's Tailscale
  adapter), one narrow Windows Firewall rule (TCP 39213 from
  `100.64.0.0/10` only, copy-paste PowerShell run by the user as
  administrator), the QR code, Add to Home Screen, and a "phone connected"
  check. Same-Wi-Fi-only remains as a tab. Tailscale detection requires the
  interface to be named Tailscale: carrier NAT also uses 100.64.0.0/10 (a
  laptop's cellular modem here holds one), and a 100.x client is only
  accepted when the connection arrived on the Tailscale adapter.
- **Always available:** with phone access on, closing the window hides
  Renvor to the system tray instead of quitting (tray menu: Open / Quit);
  the installed app can also start with Windows, hidden in the tray. One
  Renvor instance at a time (a second launch focuses the first). The PC must
  stay awake.
- Setup UI also has troubleshooting, Reset link, and a copy-paste AI prompt
  (which never includes the private link).
- Security: opt-in; link token (192-bit, stored in
  `%APPDATA%\Renvor\phone-link-token.txt`) is the credential; only
  private-network clients are answered; desktop-only channels (file dialogs,
  PDF export, backups, MCP, phone/customize settings) are refused server
  side. Plain HTTP on the LAN by design - it avoids a certificate step on
  every phone, so anyone on the same Wi-Fi with the link can use it.
- It's a web app (manifest + Apple meta tags), not an offline app: it works
  while Renvor is open on the computer. Android over plain HTTP may add a
  shortcut rather than a full install; iPhone Safari adds a full-screen app.
- Phone layout: bottom tab bar under 768px wide; desktop-only Settings tabs
  are hidden. In dev the server serves `out/renderer`, so run
  `npm run build` to refresh what the phone sees.

## Customize (Settings > Customize)

The installer ships the source (`electron-builder.yml` extraResources ->
`resources/source`). "Open source folder" copies it to
`Documents\Renvor Source` (never overwriting an existing copy) and shows a
prompt to paste into an AI coding tool: layout of the code, first-time setup
(git, npm install, npm run dev), how to add a feature end to end, and how to
build a new installer. Data in `%APPDATA%\Renvor` is unaffected by code
changes. Verified against a real packaged build (the bundle ships in
`resources/source` and copies to an editable folder).

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
