# GS Field Operations

Local Windows desktop app for a General Superintendent: weekly jobsite walks,
superintendent scoring, action item tracking, and PDF leadership reports.
Runs entirely on one computer — SQLite file on disk, no cloud backend, no
accounts. The only network calls the app ever makes are the optional AI
extraction feature and the future Procore integration; everything else,
including the MCP server, is local.

Status: **Phase 1 (Foundation) complete.** See `CHANGELOG.md` for what's
built so far and the build spec for the full phase plan.

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
Automatic backups, manual backup/restore, and JSON export/import land in
Phase 7. Until then, the file above is the only copy — back it up yourself
if you're testing with data you care about.

## MCP server (Claude Desktop integration)

Not built yet — scaffolded for in a later phase per your full-read/write
answer. It will run as a standalone local Node process (`npm run mcp`)
reading/writing the same SQLite file via WAL mode, so both it and the
Electron app can run at once. No network involved; Claude Desktop spawns it
locally like any other MCP server in its config.

## Project layout

```
src/main        Electron main process: db, IPC handlers, migrations, seed
src/preload     Typed contextBridge — the only thing the renderer can call
src/renderer    React UI
src/shared      Code shared by main/preload/renderer/mcp: scoring, IPC
                contract (zod), seed data, path resolution
src/mcp         (later phase) standalone MCP server
drizzle/        Generated SQL migrations — do not hand-edit
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
