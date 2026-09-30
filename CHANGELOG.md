# Changelog

## v0.1.2 - phone layout overhaul (2026-10-01)

The phone app was the desktop UI squeezed onto a small screen: checklist text
crushed into a one-word-wide column next to six score buttons, a 13-column
matrix needing sideways scrolling, seven-column tables clipped at the edge,
and five big stat tiles filling the first screen. Rebuilt for phones; desktop
(>=768px) is unchanged.

- **Job walk (the field screen)**: slim sticky bar with a progress bar and
  scored count; walk details (super/project/date/visit type) collapse into a
  one-line summary; one category at a time by default with Previous / Next
  category buttons at top and bottom; each item's text gets the full width with
  a row of big, equal score buttons under it.
- **Dashboard**: range dropdown instead of five buttons, compact stat tiles,
  and a card per superintendent showing overall score and only the categories
  below 4.0 ("All categories on track" otherwise) with a sort menu, instead of
  the matrix.
- **Action items**: compact stats, swipeable status row, search always visible
  with the four dropdown filters behind a "Filters" button, and cards with big
  Close / Carry / Escalate buttons instead of a table.
- **Superintendents, Projects, Job Walk recent walks, walk history**: cards
  instead of tables. Superintendent detail has a compact header, a two-column
  category grid and a shorter chart. Reports stack their stats two-up.
- **Top bar** is slimmer and shows the company name rather than repeating the
  page title; **page scroll resets** when you switch screens (it used to carry
  over); PDF export, "Past Reports" and PDF icons are hidden on the phone
  (they need the desktop).
- **Bug fixed (desktop too)**: the seeded checklist shows a literal
  `{{COMPANY}} Safety Kit on-site` - `renderCompanyText` existed but was never
  called. Checklist and walk item text now render with the company name.
- **Tests**: a real phone-size run (390px Edge against a seeded scratch app)
  - tapping a score updates progress, Next category advances and resets scroll,
  details start collapsed, no PDF controls - plus before/after screenshots of
  every screen; the desktop e2e still passes. The e2e now launches with its own
  Electron profile so it can run while a real Renvor is open (Renvor allows one
  instance per profile).
- Not verified on a physical phone or in iOS Safari (checked in Edge's phone
  emulation).

## v0.1.1 (2026-09-30)

Release used to test the in-app update flow end to end (0.1.0 installed, then
updated to this version through the Update button). No functional changes.

## Phone app, Customize tab, brand colors, How It Works (2026-09-30)

### Added
- **Settings > Phone App**: turn on, scan a QR code, add to Home Screen, and
  the phone runs the same app against the same database while Renvor is open
  (see README > Phone app). Verified with a real throwaway e2e on the built
  app + scratch data: off by default; server starts; index/manifest/icons/JS
  served; wrong token, no token and path traversal refused; API reads and
  writes the shared DB (desktop sees a phone-created project); invalid
  payloads rejected by the same zod schemas; 8 desktop-only channels blocked;
  Reset link kills the old link; turning off stops the server; a mobile
  (390px, Edge-emulated) run of Dashboard/Job Walk/Actions/Supers/Settings
  with no console errors. Unit tests for LAN address ranking, private-client
  filtering and token comparison (`lan.test.ts`).
- **Settings > Customize**: source bundle in the installer + a prompt for AI
  coding tools so anyone with the installed app can change it.
- **Settings > How It Works**, Phone App and Customize entries; Getting Started
  has a phone step.
- Responsive shell: bottom tab bar + drawer on phones, wrapping page headers,
  scrollable Settings tabs.

### Installer + in-app updates (added same day)
- **First real installer built**: `release/Renvor-Setup-0.1.0.exe` (+ blockmap
  + latest.yml). Getting there found and fixed two real packaging bugs:
  1. An `extraResources` entry with `from: .` made electron-builder drop
     `package.json` from `app.asar` (build failed its own sanity check). The
     source bundle is now staged by `scripts/prepare-source-bundle.js`.
  2. (Earlier) migrations path in packaged installs - now proven: a packaged
     copy on a scratch profile boots, runs migrations, seeds 13 categories.
- **Packaged-app checks that passed**: phone server serves the UI from inside
  `app.asar`; the source bundle ships and copies; the stdio MCP config
  (`Renvor.exe` + `app.asar\out\main\mcp.js`) connects and lists 52 tools.
- **Update button**: top-bar "Update to vX" + Settings > About > Updates
  (electron-updater on GitHub Releases; checks 15s after launch and every
  6h; download -> silent install -> relaunch, only after a click). Release
  workflow `.github/workflows/release.yml` publishes when a `v*` tag is
  pushed (tag must equal package.json version). Verified with a local fake
  feed against the packaged app: finds 9.9.9, shows the button, captures
  release notes, downloads and passes the checksum, reports up-to-date when
  versions match. Not run: the actual install-and-relaunch step (it would
  run an installer), the GitHub workflow, and a real GitHub feed - the repo
  owner/name in `electron-builder.yml` is a placeholder until you set it.
- Signing-tools step still needs Windows Developer Mode locally; the test
  installer was built with `signAndEditExecutable=false`, so its `Renvor.exe`
  lacks the embedded icon - the GitHub workflow (or Developer Mode) gives the
  branded one.

### Tailscale + always-on (added same day, on request)
- Phone App is now Tailscale-first (works from any network): guided install,
  live Tailscale detection, a scoped firewall rule, QR for the Tailscale
  address; same-Wi-Fi kept as a fallback tab. Closing the window keeps Renvor
  running in the tray while phone access is on; optional start-with-Windows in
  the installed app; single-instance lock.
- **Bug caught before shipping:** the first version treated any 100.64.0.0/10
  address as Tailscale. This PC's *cellular* adapter holds a carrier-NAT
  address in that block (100.95.60.150), which the e2e run exposed as
  unreachable. Detection now requires the adapter to be named Tailscale, and
  100.x clients are only accepted if they arrived on that adapter.
  Verified: 11 unit tests, and an e2e of tray behavior (closing the window
  hides it, the server keeps serving, turning phone access off works).
- **Not tested:** Tailscale itself is not installed on this PC, so the actual
  phone-over-Tailscale path, the firewall rule, and start-with-Windows are
  unverified end to end.

### Fixed
- **Brand colors did nothing.** Primary/Accent were saved but never applied;
  they now drive `--brand` / `--info` (and derived shades via color-mix()).
- **Claude Desktop connector** - see the entry below (stdio config is the
  supported path; the URL dialog can never reach localhost).
- Packaged installs looked for `drizzle/` in the wrong place (see below).

### Refactors
- `registerIpc.ts` records handlers in a registry; `preload` now builds its API
  from `src/shared/apiBridge.ts` so the phone build reuses it.

### Not verified
- Real-phone Add-to-Home-Screen on iOS/Android, Tailscale end to end, and the
  firewall rule were not tested on physical devices (packaged-build behaviour
  is covered above).

## MCP connector: switched Claude Desktop setup to stdio config (2026-09-28)

You reported the connector still failed with the same error after the CORS
fix. Added temporary request logging to the HTTP server, rebuilt, had you
retry - the log showed **zero requests from Claude Desktop ever reached
the server**, only Renvor's own periodic self-check. That ruled out
everything app-side.

### Root cause
Claude Desktop's "Add custom connector" dialog runs its reachability check
from Anthropic's own servers, not the local machine - confirmed via
[anthropics/claude-ai-mcp#917](https://github.com/anthropics/claude-ai-mcp/issues/917)
and Anthropic's own connector docs. `127.0.0.1`/`localhost` on Anthropic's
server is Anthropic's own loopback, never this computer. No cert fix, no
CORS fix, nothing server-side could ever have made this work - the
paste-a-URL flow is fundamentally remote-only.

### Fix
- Flipped Settings > MCP and Getting Started to lead with the stdio
  `mcpServers` config (the method that actually works with Claude
  Desktop), with the HTTPS URL method demoted to a collapsed "other MCP
  clients" section.
- The generated config's `command` now points at `process.execPath` (this
  running app's own executable) instead of a system `node` +
  `scripts/run-mcp.js` - works identically in dev and in a packaged
  install, and doesn't require Node.js to be installed on the user's
  machine at all.
- New `Settings > MCP` → "Open Claude config folder" button
  (`shell.openPath` on `%APPDATA%\Claude`) so setup doesn't require the
  user to type an AppData path by hand.
- Verified for real: a standalone MCP SDK client spawned with the exact
  generated `command`/`args`/`env` (against a scratch `APPDATA`) connected,
  listed all 52 tools, and successfully called `get_settings`.

### Real bug found and fixed along the way
Switching the stdio config to point at the packaged app's own binary
surfaced a latent bug in how migrations resolve their path when packaged:
`join(__dirname, '../../drizzle')` assumes `drizzle/` sits two directories
above the running JS file, true in dev but not once `out/**/*` is packed
into `app.asar` — `drizzle/` ships as an `extraResources` sibling of
`app.asar`, not inside it. This affected the **main app's own boot
sequence** too (`src/main/index.ts`), not just MCP - a packaged install
would have failed to find its migrations on first launch. Fixed both call
sites (`index.ts` via `app.isPackaged`; `src/mcp/server.ts`, which has no
`app` module to ask in `ELECTRON_RUN_AS_NODE` mode, via a
`RENVOR_DRIZZLE_DIR` env var the spawning process resolves and passes
through). Not yet verified against a real packaged build - `build:win`
still needs Windows Developer Mode enabled on this machine to produce one
(see README > Build).

## MCP server: CORS headers (2026-09-28)

You confirmed the cert-trust fix from before - `Continue anyway` had let
you save the connector, but the underlying connection still failed - and
you'd genuinely completed the Windows trust wizard already. Verified that
directly: a fresh check via Electron's `net` module AND Node's `fetch`
both now succeed against the cert on this machine, confirming the trust
step itself worked. So the remaining failure had to be something else.

### Root cause
- Every way this server had been verified so far - Node's `fetch`/`https`,
  Electron's `net` module, `curl` - runs from a **process**, not a
  **browser page**, so none of them are subject to CORS at all. Claude
  Desktop's connector UI almost certainly runs its reachability check from
  a Chromium **renderer** (it's the actual dialog you're looking at), which
  *is* subject to CORS - a cross-origin `fetch()` with a custom
  `Content-Type`/`Accept` header triggers a preflight `OPTIONS` request
  first. The server had no CORS headers at all; confirmed directly that
  `OPTIONS /mcp` was returning a bare `405 Method Not Allowed` with no
  `Access-Control-*` headers. A browser blocks a request like that
  client-side before the page ever sees a real response - which presents
  identically to "couldn't reach this address," even though the server
  was right there answering every non-browser client that asked.

### Added
- `httpServer.ts` now answers `OPTIONS /mcp` with `204` and
  `Access-Control-Allow-Origin` (reflecting the request's `Origin`),
  `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers`
  (reflecting `Access-Control-Request-Headers`), and adds
  `Access-Control-Allow-Origin` to every other response too - a
  successful preflight isn't enough on its own; the browser also blocks
  reading the *real* response afterward without that header present on
  it as well.

### Verified
- Per the standing instruction - no computer-use. `npx tsc --noEmit`
  clean, `npm run build` succeeds, `npx vitest run` still 38/38,
  `npx playwright test` (the real committed suite) still passes.
- Before touching any code: independently re-confirmed the cert-trust fix
  actually worked (Electron `net` and Node `fetch` both now succeed
  against the real running server's cert), which is what narrowed the
  problem down to something CORS-shaped rather than re-litigating the
  certificate.
- After the fix: launched a scratch-profile instance of the actual built
  app and, with certificate validation deliberately bypassed for this one
  diagnostic (a fresh scratch profile gets its own fresh untrusted cert,
  which is a separate concern from the CORS bug being tested), confirmed
  with a real `Origin: https://claude.ai` header that `OPTIONS /mcp` now
  returns `204` with the three `Access-Control-*` headers present and
  correct, and that a real `POST /mcp` response carries
  `Access-Control-Allow-Origin` too - not just that the preflight passes,
  that the actual response would be readable by a browser afterward.

## MCP cert trust: real detection + guided fix (2026-09-25)

Follow-up to the HTTPS switch above, same day: you tried pasting the new
`https://` URL into Claude Desktop and it said "Couldn't reach this
address." Confirmed with `curl` that this is a real, hard failure, not a
config issue - Claude Desktop does strict certificate validation with no
bypass, and a self-signed cert fails that outright
(`SEC_E_UNTRUSTED_ROOT`). This needed a real fix: trusting the certificate
in Windows' certificate store, once, per machine.

### Added
- Settings > MCP (and the inline copy on Getting Started) now shows a real
  live status: "Certificate trusted" or, if not, an "Open certificate"
  button plus the exact Windows Certificate Import Wizard steps (Current
  User store specifically - no admin rights needed).
- `getMcpCertFilePath()` (cert.ts) writes a `.cer` copy of the same cert
  alongside the existing `.pem` files, since Windows reliably opens `.cer`
  with its native Certificate viewer on double-click/open in a way `.pem`
  isn't.
- `IPC.MCP_OPEN_CERT_FILE` opens that file via `shell.openPath()`, handing
  off to Windows' own native trust UI - the app never runs a command that
  touches the certificate store itself. That's a deliberate boundary:
  modifying the trusted-root store is something only you can choose to do
  on your own machine, through Windows' own security prompts, not
  something this app (or I) should do on your behalf even with a button
  click standing in for consent.

### Real bug found and fixed while building the detection
- First version of the "is the cert trusted yet" check used Node's own
  `https` module. Verified directly (a standalone Node script against the
  actual untrusted cert) that this was wrong: Node's `https`/`http`
  modules validate against Node's own bundled Mozilla CA list, never the
  OS certificate store - so that check would have reported "untrusted"
  forever, even the moment after you successfully trust the cert in
  Windows. The error Node throws even says so directly: "if the root CA
  is installed locally, try running Node.js with --use-system-ca" (a flag
  that may not even exist in Electron's bundled Node 20.18.3 here).
  Switched to Electron's `net` module instead, which is backed by
  Chromium's own network stack and does use the platform certificate
  verifier - confirmed by testing both against the same untrusted cert
  side by side: Node's `https` throws `DEPTH_ZERO_SELF_SIGNED_CERT`,
  Electron's `net` throws `ERR_CERT_AUTHORITY_INVALID` - the same
  Chromium-native error curl's Windows Schannel backend effectively
  reports too. Caught before shipping, not after - this was verified by
  direct experiment, not assumed to be fine because it compiled.

### Verified
- Per the standing instruction - no computer-use. `npx tsc --noEmit`
  clean on both configs, `npm run build` succeeds, `npx vitest run` still
  38/38, `npx playwright test` (the real committed suite) still passes.
- Two isolated standalone experiments before touching the app code: (1)
  confirmed `curl` genuinely rejects the untrusted cert with
  `SEC_E_UNTRUSTED_ROOT`, ruling out "maybe it actually works and Claude
  Desktop is just being extra cautious"; (2) confirmed Electron's `net`
  module reports the equivalent Chromium-native rejection
  (`ERR_CERT_AUTHORITY_INVALID`) for the exact same cert, proving it's the
  right detection mechanism before wiring it into the app.
- A throwaway, real end-to-end check (written, run, deleted in this same
  turn): launched the app fresh (genuinely-untrusted cert, no shortcuts),
  confirmed the "One-time step needed first" warning renders (not
  hardcoded - a trusted state would show the green confirmation instead),
  confirmed the referenced cert file exists on disk at the exact path the
  UI names, and confirmed clicking "Open certificate" calls
  `shell.openPath` with that exact file path - not just that the button
  exists, that it does the right thing.
- What's NOT verified, and can't be from here: that clicking through
  Windows' Certificate Import Wizard flips the status to "trusted" -
  that's your action on your machine, not something I ran or can run
  myself. The detection mechanism itself is proven correct (see above);
  the only untested step is the manual one only you can perform. Please
  try it and confirm the status flips to trusted and Claude Desktop
  connects.

## MCP server: HTTPS instead of HTTP (2026-09-25)

You reported Claude Desktop's custom connector needs an `https://` URL,
not `http://` - even for localhost. Switched the in-process MCP server to
HTTPS.

### Added
- `src/main/mcp/cert.ts` - generates a self-signed TLS cert (CN=localhost,
  SANs for `localhost` + `127.0.0.1`, 10-year validity) via the new
  `selfsigned` dependency (pure JS, no native compilation - deliberately
  avoided anything requiring a C++ toolchain, given this project's history
  with that). Cached to `%APPDATA%\Renvor\mcp-cert\` so it's generated
  once, not regenerated every launch.
- `httpServer.ts` now uses Node's `https` module instead of `http`, loaded
  with that cert. The connector URL is now `https://127.0.0.1:39212/mcp`.
  Same port, same DNS-rebinding protection, same tool set - only the
  transport-level encryption changed.
- Since no real CA issues certificates for `127.0.0.1`, this is
  necessarily self-signed - Claude Desktop (or any client, or the OS) may
  still show an untrusted-certificate warning the first time. Documented
  in the README rather than hidden; there isn't a way around this for a
  purely local server.

### Real bug found and fixed while verifying this
- The first end-to-end HTTPS check failed with a TLS-layer error ("wrong
  version number") that looked like a broken certificate. It wasn't: an
  earlier `npm run dev` instance (started several turns before this
  change, for you to look at the app) was still running in the
  background and still holding port 39212 with the **old plain-HTTP**
  server. The new HTTPS build's own server failed to bind (port already
  in use) while the stale HTTP server kept answering on that port - the
  test was unknowingly talking to old code, not the new HTTPS server at
  all. Killed the stale process, confirmed the port was genuinely free,
  reran, and the real HTTPS server verified clean. Worth remembering for
  next time this comes up: a long-running dev instance from an earlier
  turn can silently shadow a rebuilt one on the same fixed port.

### Verified
- Per the standing instruction - no computer-use. `npx tsc --noEmit`
  clean on both configs, `npm run build` succeeds, `npx vitest run` still
  38/38, `npx playwright test` (the real committed suite) still passes.
- Isolated the cert/TLS mechanism first, outside Electron entirely: a bare
  Node script generating a cert with `selfsigned` and connecting to a
  plain `https.createServer` via `tls.connect` - handshake succeeded, cert
  CN correct. Confirmed the building blocks work before debugging the
  app-level failure above.
- A throwaway, real end-to-end check (written, run, deleted in this same
  turn): launched the app, confirmed the Settings > MCP URL genuinely
  reads `https://127.0.0.1:39212/mcp`, confirmed the cert file exists on
  disk at the documented cache path, connected a real MCP client over
  `StreamableHTTPClientTransport` to the HTTPS URL, listed all 52 tools,
  and called `list_projects` successfully over the encrypted connection.

## Settings > Getting Started (2026-09-25)

Follow-up to a question about distributing this to other people: each
person gets their own private install (no shared server, no accounts -
confirmed explicitly, matches everything built so far), and a PWA rebuild
was explicitly scoped out rather than half-built - Renvor's entire data
layer is SQLite via an Electron-only native module, so "make it a PWA"
would mean re-architecting the DB layer, PDF export, backups, and MCP
access from scratch, not a settings toggle. Skipping that, this adds the
actual ask: a setup guide in Settings for whoever downloads this next.

### Added
- Settings > Getting Started - new first tab (default landing spot,
  replacing Company as the default). Four numbered steps: install/launch,
  confirm company info (with a live checkmark once onboarding's done),
  add projects/supers/checklist/people (jump buttons to the real tabs),
  and connect Claude Desktop via MCP - the URL box is inlined right on
  this page, not just linked to, since that's the one step with real
  friction (a manual paste into Claude Desktop's Connectors settings -
  there's no way for an app to register itself there, by design).
- Extracted `CopyButton` (`src/renderer/src/components/CopyButton.tsx`)
  and `McpConnectBox` (`src/renderer/src/pages/settings/McpConnectBox.tsx`,
  the URL box + live status dot) out of the MCP panel so both it and
  Getting Started use the same one, not two copies.

### Verified
- Per the standing instruction - no computer-use. `npx tsc --noEmit` clean
  on both configs, `npm run build` succeeds, `npx vitest run` still 38/38,
  `npx playwright test` (the real committed suite) still passes.
- A throwaway, real end-to-end check (written, run, deleted in this same
  turn): onboarded, opened Settings, confirmed it lands on Getting Started
  by default (not Company), confirmed the onboarding-complete checkmark
  shows the real company name, confirmed the inline MCP URL box renders a
  real URL, and clicked "Go to Company" through to the actual Company tab
  with the real saved value showing in the field - not just that the
  buttons exist, that they navigate to the right place with real data.

## MCP over HTTP: paste-a-URL connector (2026-09-25)

Follow-up to the Settings > MCP panel above, same day: you clarified you
wanted an actual URL to paste into Claude Desktop's Custom Connector UI,
not a config-file snippet. That's a different MCP transport (Streamable
HTTP, not stdio), so this adds a second transport rather than just
changing the panel's copy.

### Added
- `src/main/mcp/httpServer.ts` - an MCP-over-HTTP server the Electron app
  hosts **in-process**, started when the app launches and stopped when it
  quits. Bound to `127.0.0.1` only (never `0.0.0.0` - this is full
  read/write access to the app's data with no authentication, so it must
  never be network-reachable), plus the SDK's built-in DNS-rebinding
  protection (`enableDnsRebindingProtection` + a `Host` header allow-list)
  so a malicious webpage open in any browser on the machine can't `fetch()`
  it via a spoofed Host header. Fixed port `39212` (not random) so the URL
  the user pastes into Claude Desktop once stays valid across app restarts.
- Extracted all `server.registerTool(...)` calls out of `src/mcp/server.ts`
  into `src/mcp/tools.ts` (`registerMcpTools(server)`), so the exact same
  52-tool set is shared between the stdio server (`npm run mcp`, a
  separate process, for clients that want a config-file entry) and the new
  in-process HTTP server. One tool set, two transports - not a second
  feature set to maintain.
- Settings > MCP panel rewritten to lead with the URL (big copyable code
  box + status dot showing whether the HTTP server actually started) and a
  live/error status line; the config-file/stdio method moved to a
  collapsed "prefer a traditional mcpServers config instead?" section
  underneath, not removed.
- `IPC.MCP_GET_CONNECTOR_INFO` now returns both: the live HTTP URL +
  running/error status, and the stdio command/args/config snippet as
  before.

### Why in-process instead of a second spawned process
- The HTTP server runs inside the same already-running Electron process
  that handles everything else - unlike the stdio server, there's no
  separate-process/ELECTRON_RUN_AS_NODE dance needed to load
  better-sqlite3's Electron-ABI binary, since it's the exact same process
  already calling `getDb()` for the rest of the app. Simpler, and it also
  sidesteps the "packaged installs don't ship `scripts/`" gap the stdio
  method still has (flagged in the previous entry) - the HTTP URL works
  for a packaged install too, once one exists, with zero extra packaging
  work.

### Verified
- Per the standing instruction - no computer-use. `npx tsc --noEmit` clean
  on both configs, `npm run build` succeeds, `npx vitest run` still 38/38,
  and the real committed `npx playwright test` smoke suite still passes.
- A throwaway, real end-to-end check (written, run, and deleted in this
  same turn - not left in the repo) that actually exercised the HTTP
  transport, not just the UI: launched the app, connected a real MCP
  `Client` over `StreamableHTTPClientTransport` to
  `http://127.0.0.1:39212/mcp`, listed all 52 tools, called `create_project`
  over HTTP, confirmed the write landed via `list_projects` over the same
  connection, and - importantly - sent a raw request with a spoofed `Host:
  evil.example.com` header and confirmed the server actually rejects it
  (403), proving the DNS-rebinding protection is live, not just configured
  and silently doing nothing.

## Settings > MCP panel (2026-09-25)

The "AI" settings tab had said "Soon" since Phase 1, left over from the
original spec's API-key-based AI extraction plan that Phase 8 replaced
with the MCP connector - the tab itself never got updated to reflect that.
Renamed it "MCP" and gave it real content per your request.

### Added
- Settings > MCP: explains what the MCP connector actually does (full
  read/write access to this app's data for Claude, no API key, no cloud AI
  calls from the app itself), and shows a ready-to-paste
  `mcpServers` config block for Claude Desktop with a "Copy config" button
  (`navigator.clipboard.writeText` - works fine in the sandboxed renderer,
  no new IPC needed for that part).
- New `IPC.MCP_GET_CONNECTOR_INFO` handler resolves the real, absolute path
  to `scripts/run-mcp.js` on this machine at request time, instead of the
  panel hardcoding a path that would only work on one machine.
- Company tab's description no longer mentions "AI prompts" (stale text
  from before the Phase 8 pivot) - now says "anything Claude sees over
  MCP."

### Real bug found and fixed
- First implementation resolved the script path via `app.getAppPath()`,
  which seemed reasonable but is wrong in this exact launch shape: it
  resolves to `out/main` (the folder holding `index.js`, since there's no
  `package.json` next to it), not the project root - so the generated
  config pointed at a script that doesn't exist
  (`out\main\scripts\run-mcp.js`). Caught by an end-to-end Playwright check
  that actually parsed the panel's JSON and asserted the resolved path
  exists on disk, not just that a string was rendered. Fixed using the
  same pattern Phase 10 already established for `db/migrate.ts`'s
  migrations-folder path: resolve from the entry file's own `__dirname`
  and pass it down as a parameter (`registerIpcHandlers(projectRoot)`)
  rather than computing it inside a module that could end up in a shared
  Rollup chunk one directory deeper.

### Decisions made without asking again
- The panel is explicit that this connector method only works "from
  source" on this machine (`npm run mcp` / `scripts/run-mcp.js`) - a
  packaged install doesn't ship `scripts/` yet (electron-builder.yml's
  `files` list is `out/**/*`, `drizzle/**/*`, `package.json` only).
  Packaging that cleanly for an end-user install (Bryce's friend, not just
  this dev machine) is real future work, not done here - flagging instead
  of quietly overselling what "Connect Claude Desktop" currently means for
  a packaged `.exe`.

### Verified
- Per the standing instruction - no computer-use. `npx tsc --noEmit` clean
  on both configs, `npm run build` succeeds, `npx vitest run` still 38/38,
  and the real committed `npx playwright test` smoke suite still passes.
- A throwaway Playwright check (not committed - written, run, and deleted
  in this same turn) drove the actual UI: onboarded, opened Settings > MCP,
  parsed the rendered JSON config, confirmed the resolved script path
  exists on disk and points at the right file, and clicked "Copy config"
  through to its "Copied" state. This is what caught the `app.getAppPath()`
  bug above - a bare typecheck/build would not have.

## Rebrand: gs-field-ops → Renvor (2026-09-25)

Post-Phase-10, product rename per your request: new name "Renvor" and a
real logo mark (an "R" glyph you provided) replacing the placeholder
clipboard icon from Phase 10.

### Added
- `build/icon.ico` / `build/icon.png` regenerated from the real logo
  (`scripts/assets/renvor-logo-source.jpg`) instead of the generic
  ClipboardCheck placeholder. `scripts/generate-icon.js` now auto-crops the
  source (an Electron `<canvas>` scans for the mark's bounding box and
  centers it with padding on a white square) rather than hand-drawing an
  SVG, since there's a real logo to work from now.
- `package.json` name, `electron-builder.yml` `productName`/`appId`,
  `app.setName()`, the MCP server's identity, window/page titles, the
  onboarding label, and the sidebar's product-name line all renamed from
  "gs-field-ops" / "GS Field Operations" to "renvor" / "Renvor".
- PDF and JSON export filenames renamed to match:
  `Renvor-Walk_...`, `Renvor-Report_Full/Exec_...`,
  `Renvor-Data-Export_...` (previously `GS-Walk_`, `GS-Report_`, etc).
  Default backup folder renamed to `Documents/Renvor Backups` going
  forward (existing backups already in the old `GS Dashboard Backups`
  folder are untouched, not moved - see below).

### The important part: data continuity
- Electron's `userData` folder is named after `app.getName()`/`productName`
  - renaming the app moves where the database lives
  (`%APPDATA%\gs-field-ops` → `%APPDATA%\Renvor`). Since you'd already put
  real data into the app during earlier testing (a real project, a real
  superintendent, etc.), a naive rename would have made the app look empty
  on next launch even though nothing was actually lost.
- Fixed with `migrateLegacyAppDataDirIfNeeded()` (`src/shared/paths.ts`),
  called once at startup in both the Electron app and the MCP server,
  before anything touches the database: if the new `Renvor` folder has no
  database yet and the old `gs-field-ops` folder does, it **copies** (never
  moves or deletes) the db + WAL/SHM sidecar files across. Idempotent - a
  no-op on every launch after the first. The old folder is left exactly as
  it was, so nothing is destroyed even if this needed to be undone.
- Did **not** attempt to auto-move the `Documents/GS Dashboard Backups`
  folder - unlike the APPDATA db folder (a fixed, predictable path),
  backups can live anywhere the user configured, and automating a move
  across an arbitrary external folder felt riskier than the value it added
  for a one-time rename. New backups go to the new default location; old
  ones stay put and are still just files in Documents if you want them.

### Verified
- Per the standing instruction - no computer-use. Verified via:
- `npx tsc --noEmit` clean on both configs; `npx vitest run` still 38/38;
  `npm run build` succeeds (confirmed `renvor@0.1.0` in the build output).
- `npx playwright test` - the full e2e smoke test still passes end to end
  post-rename.
- The migration function itself, for real - not reimplemented/faked in the
  test: imported the actual `migrateLegacyAppDataDirIfNeeded` from
  `src/shared/paths.ts` against fake scratch `gs-field-ops`/`Renvor`
  folders (never your real `%APPDATA%`) and confirmed the db + WAL file
  copy correctly, an unrelated folder entry (`pre-migration-backups`) is
  correctly skipped, the old folder is left untouched, and a second call
  is a true no-op (doesn't clobber a database that already migrated).
- `file build/icon.ico` confirms a valid 7-size Windows icon resource
  built from your logo.
- Bryce, please confirm on your machine that your existing project/
  superintendent test data actually shows up after this update - the
  migration is tested against fake data here, not your real file, since I
  don't touch your real `%APPDATA%` directly per your earlier instruction.

## Phase 10 — Polish & Package (2026-09-25)

Started with a full audit against the build spec's Section 8 quality bar
(confirmations, empty states, error handling, test coverage, Playwright,
app version display, logging, installer icons) before writing any code, so
this phase closes documented gaps rather than guessing at scope.

### Added
- **Error handling**: 4 screens had mutations that silently swallowed
  failures (no `onError`, nothing shown to the user, nothing logged) -
  found by the audit, fixed in all of them: Job Walk's "Start Walk",
  Action Items' close/carry/reopen and delete, and every mutation in the
  Checklist and People settings panels (weight edit, item rename/frequency/
  active toggle, add item, reorder, remove person). Each now surfaces the
  real error message inline instead of nothing happening.
- **Reports empty state**: "No data for this week yet" told the user
  nothing useful; now names the actual week range and says what to do
  (pick a different week, or complete a walk).
- **Unit tests for report assembly and the legacy importer** (previously
  zero coverage - can't run a real DB under plain-Node `vitest run` since
  `better-sqlite3` here needs Electron's Node ABI, so testing the DB-facing
  functions directly isn't possible without a lot of extra machinery).
  Extracted the actual business-logic decisions into pure, DB-free
  functions and tested those instead: `isRedFlagCategory` and
  `computeActionItemStats` (both now in `src/shared/scoring.ts`, used by
  `reportsRepo.ts`'s red-flag and action-item-stats assembly), and exported
  `legacyId`/`itemText`/`parseLegacyFile` from `legacyImport.ts` for direct
  testing. 21 new test cases; suite is now 38/38 across 3 files. Also added
  `vitest.config.ts` with the `@shared`/`@main` path aliases - the legacy-
  importer test was the first to transitively need them and vitest didn't
  have any alias config until now.
- **App version + logs**: new Settings > About tab shows the app version
  (the IPC bridge for this existed since Phase 1 but was never called from
  any UI) and an "Open logs folder" button. Backing it: `src/main/logger.ts`,
  a small file logger (`app.getPath('logs')`, one file per day) wired into
  app startup, uncaught exceptions/rejections, and daily/exit backup
  success or failure.
- **Playwright E2E smoke test** (`e2e/smoke.spec.ts`, `playwright.config.ts`,
  `npm run test:e2e`) - the exact flow the spec calls for: create a project
  → create a superintendent → complete and submit a walk → the action item
  appears on Action Items → the report shows the walk → PDF export produces
  a real file. Runs against the actual built app (Playwright's Electron
  mode) with a scratch APPDATA directory, never the real database. The
  native save dialog is stubbed via `electronApp.evaluate` so PDF export
  doesn't need a human at a file picker.
- **Installer icon**: `build/icon.ico` (7 sizes, 16-256px) + `build/icon.png`,
  wired into `electron-builder.yml`'s `win.icon` and the dev BrowserWindow.
  No external design tool or asset needed - `scripts/generate-icon.js` uses
  Electron itself (an offscreen `BrowserWindow` + `capturePage()`) to
  rasterize an SVG built from the `lucide-react` "ClipboardCheck" icon
  (already a dependency, ISC-licensed) in the app's own default brand
  colors (`#0B0E12` canvas, `#FF8A24` brand) - not any specific company's
  branding, since the app is white-labeled per install.

### Real bugs found and fixed
- **Action items created from Job Walk didn't appear on Action Items or
  Dashboard for up to 30 seconds.** Caught by the Playwright smoke test,
  not by inspection - the test genuinely failed on a real bug, not a test
  artifact (confirmed by dumping the DB directly via `electronApp.evaluate`
  mid-test: the row existed with `status: "open"` immediately, the UI just
  wasn't refetching it). Root cause: `NewActionItemForm`'s create mutation
  in `jobwalk/ActionItemsSection.tsx` only invalidated the `open-action-
  items` query key, never `action-items-all` - and the app's QueryClient
  has a 30-second global `staleTime`, so the Dashboard/Action Items page's
  already-cached (often empty) list wouldn't refetch until that window
  passed. Fixed there and in the matching Close/Carry mutation in the same
  file (`ReviewRow`), which had the identical gap. Also fixed the reverse
  direction for consistency: Action Items page's transition/delete
  mutations weren't invalidating `open-action-items`, so closing/deleting
  an item there could leave Job Walk's "must resolve before submitting"
  review list stale for the same 30 seconds.

### Decisions made without asking again
- Onboarding and Settings weren't given a literal `EmptyState` component
  (Onboarding is a first-run wizard, not a list; Settings mostly delegates
  to panels like People/Checklist that already have their own inline
  "no X yet" messaging) - the spec's actual requirement ("tell the user
  what to do next") was already met there, so this phase only touched
  Reports, the one screen the audit found genuinely lacking it.
- The e2e test completes a walk via "Mark all remaining N/A" rather than
  clicking through individual 1-5 score buttons - a full smoke test needs
  a submitted walk, not a demonstration of the score-selector UI itself
  (which isn't what this test is for), and per-item button targeting would
  be far more brittle for little added coverage.
- `build:win`'s pre-existing Windows-Developer-Mode/symlink limitation
  (documented since Phase 1) meant the new icon can't be verified embedded
  in an actual `.exe` on this machine - confirmed the icon file itself is
  valid (`file build/icon.ico` reports a correct 7-size Windows icon
  resource) and the electron-builder config is syntactically correct, but
  flagging that the final embed step is unverified rather than claiming
  it's confirmed working.

### Verified
- Per the standing instruction - no computer-use click-through. Verified
  via:
- `npx tsc --noEmit` clean on both configs.
- `npx vitest run` - 38/38 passing (17 new scoring.ts cases + 14 new
  legacy-importer cases, on top of the existing 7 Procore mock tests).
- `npx playwright test` - the full spec-mandated smoke test passes end to
  end against the real built app, including a real PDF file landing on
  disk at the stubbed save path.
- `npm run build` succeeds; `build/icon.ico` and `build/icon.png` verified
  as valid image files via the `file` command (correct dimensions, correct
  ICO structure, no distortion after fixing an early bug where the capture
  window's title bar shrank the captured image to a non-square 240x191).
- Bryce, please do these yourself: enable Windows Developer Mode and run
  `npm run build:win` to confirm the installer builds and the icon shows up
  correctly in the taskbar/installer; run `npm run test:e2e` once yourself
  to see it pass live.

## Phase 9 — Procore Scaffolding (2026-09-25)

You re-sent the original build spec this phase after context compaction
lost the exact text - Section 7 turned out to specify this phase precisely
(typed interface, mock client, feature flag, hidden UI using mock data,
integration doc), so this phase follows it directly rather than guessing.

### Added
- `src/main/integrations/procore/` - `ProcoreClient` typed interface
  exactly as specified (`isConnected`, `listProjects`, `listDailyLogs`,
  `listObservations`, `listInspections`), `MockProcoreClient` (deterministic
  per project+date-range fake data via a seeded PRNG - same inputs always
  return the same mock numbers), and `getProcoreClient()`, the single
  factory function every caller goes through so swapping in a real client
  later is a one-line change.
- `settings.procoreEnabled` feature flag (default off). All new Procore UI
  is gated behind it; when it's off nothing changes anywhere in the app.
- Job Walk: a "Procore this week" panel (daily logs / observations /
  inspections for the walk's project+super+week) plus a hint next to the
  Record Keeping "Daily reports filled out fully with quality photos" item
  - the exact example the spec calls out - showing the mock daily-log count.
- Action Items: "Import from Procore" button (next to a project filter)
  opens a dialog listing open mock observations with checkboxes; import
  creates them as action items with `source: 'procore'` and a
  `sourceSummary` referencing the observation number.
- Project and Superintendent edit forms: Procore ID fields
  (`procoreProjectId`/`procoreCompanyId` on projects, `procoreUserId` on
  superintendents - the DB columns and IPC schema already existed since
  Phase 1, only the UI was missing) - hidden unless `procoreEnabled` is on,
  per spec 5.6 ("leave space for the Procore ID fields... hide them until
  Procore is enabled").
- Procore page: kept the existing "coming soon" + disabled Connect button
  as-is (that part of the integration genuinely isn't built), added a
  "Preview with mock data" toggle that flips `procoreEnabled` so the above
  can be reviewed without a real Procore account.
- `docs/PROCORE_INTEGRATION.md` - where a real client, OAuth flow (main-
  process-only, per the security rules), and `safeStorage`-based credential
  storage plug in later, plus exactly which files change and which don't.
- Fixed two real gaps in existing code found while wiring this up: (1)
  `createActionItemInput`/`createActionItem` never accepted `sourceSummary`
  despite the DB column and DTO already having it - only `legacyImport.ts`'s
  raw insert ever set it. Needed for a meaningful Procore-import summary, so
  extended the create path generally rather than special-casing Procore.
  (2) Same story for `Superintendent.procoreUserId` and the two Procore
  fields on `Project` - present in the schema/DB since Phase 1 but never in
  the create/update zod input schemas, so there was no way to ever set them
  before this phase.

### Decisions made without asking again
- The sidebar's Procore nav item stays always-visible with no gating - per
  spec 5.1's own layout description ("Procore... shown as 'Coming soon' for
  now"), the always-visible nav item IS the intended coming-soon state; only
  the *mock-data-consuming* UI (panel, import button, ID fields) is gated
  behind the flag per Section 7's "when it's off, all Procore UI is
  hidden," read as referring to this phase's new UI specifically.
- "Procore this week" uses the Monday-Sunday week containing the walk's
  date (same week-math as Reports), not a rolling 7-day window - matches
  how "this week" is defined everywhere else in the app.
- "Import from Procore" looks back 180 days for open observations rather
  than requiring a date range from the GS - a real job's open observations
  could be older than one week; 180 days comfortably covers anything still
  open without asking for extra input on a scaffolding feature.

### Verified
- Per the standing instruction - no computer-use click-through. Verified
  via:
- `npx tsc --noEmit` clean on both configs; `npm run build` succeeds
  (`out/main/index.js` grew from the two new repo functions and their
  imports; no new build entries needed since Procore isn't exposed over
  MCP - the spec never asked for that).
- `npx vitest run` - 19/19 passing (12 existing + 7 new
  `MockProcoreClient` tests covering determinism, date-range filtering,
  per-project variation, and valid status enums).
- A real end-to-end smoke test (via `ELECTRON_RUN_AS_NODE` + `tsx`,
  against a scratch database, never the live file) exercising the full
  chain: create project+super with Procore IDs set -> fetch the walk panel
  data -> list open observations -> import 2 of them as action items ->
  confirm both landed with `source: 'procore'` and a correct
  `sourceSummary`, and that the action-item count increased by exactly 2.
  All passed.
- Bryce, please click through this one yourself: turn on "Preview with
  mock data" on the Procore page, open a Job Walk for a project/super pair
  to see the panel and the Record Keeping hint, and try "Import from
  Procore" on Action Items with a project selected.

## Phase 8 — MCP Connector (2026-09-25)

### Added (batch/composite tools, same-day follow-up)
- 14 new `batch_*` tools (create/archive/delete many projects,
  superintendents, people, checklist items, action items, or walks in one
  call instead of one call per item) plus two composite tools:
  `record_walk` (create a walk and set every item score, category note,
  and overall/follow-up notes, then submit - all in one call instead of
  create_walk + dozens of set_item_score calls) and
  `batch_set_item_scores` (re-score many items on an existing walk in one
  call). Total tool count: 38 -> 52. Direct response to your "make sure i
  can do many things in one call... not one task per call" - the walk
  scoring flow especially: a real walk can be 30-80 checklist items, which
  was 30-80 separate tool calls before this.
- Every batch/composite tool runs its writes inside a single
  `db.transaction()` - one bad item rolls the WHOLE call back rather than
  leaving a half-applied walk or action-item list. Verified with an
  automated test that intentionally sends one invalid item inside a
  3-item batch and confirms zero rows land, not 2 out of 3.

### Added (Phase 8 base)
- Full read/write MCP server (`src/mcp/server.ts`, 38 tools) covering
  settings (read-only), projects, superintendents, people, categories/
  checklist items, walks (create through submit/archive, item scoring,
  category notes, copy-from-last-walk's underlying item-history lookup),
  action items (create through transition/delete, event history), and
  read-only dashboard matrix / weekly report data. This replaces the
  Phase-1-planned in-app "AI extraction" features (paste-to-extract,
  walk-note scan calling an API) per your explicit direction this phase:
  no API-key-based AI calls from inside the app - Claude connects to this
  server directly and works with the real data itself.
- `scripts/run-mcp.js` - the launcher `npm run mcp` and any MCP client
  config should point at. Runs the Electron binary itself in
  `ELECTRON_RUN_AS_NODE=1` mode rather than plain `node`/`tsx`, since
  `better-sqlite3` here is compiled against Electron's Node ABI (see
  Phase 1's `postinstall`) and fails to load under real Node.
- `source: 'mcp'` added to the action item source enum (alongside the
  existing `walk`/`manual`/`ai_text`/`ai_walk_scan`/`procore`), so items
  Claude creates via the connector are labeled honestly instead of
  looking hand-entered. No migration needed - Drizzle's `text(..., {enum})`
  is a TypeScript-only narrowing for SQLite text columns, not a DB-level
  constraint (confirmed via `drizzle-kit generate`: no schema diff).

### Decisions made without asking again
- Settings are exposed read-only over MCP. "Full read/write" was scoped
  to operational data (projects, supers, walks, action items, etc.) -
  company name/brand colors changing mid-chat isn't a scenario that
  answer was meant to cover, so that stays a Settings-UI-only edit.
  Flagging this as a judgment call, not silently assumed.
- No PDF export, backup/restore, or legacy-import tools over MCP -
  those are inherently tied to Electron's native save/open dialogs and
  BrowserWindow-based PDF rendering, not meaningful for a headless
  connector process.

### Real bug found and fixed while building this
- Adding a second Rollup entry point (`mcp.js` alongside `index.js`) made
  Vite/Rollup factor shared code - including `db/migrate.ts` - into a
  `out/main/chunks/` subdirectory. `migrate.ts` located the `drizzle/`
  migrations folder via its own `__dirname`, which had silently been
  correct only because it used to live directly in `out/main/` - once it
  moved into `chunks/`, that path resolved one directory too shallow for
  BOTH entries, not just the new one. Caught immediately by the MCP smoke
  test below (it failed outright rather than silently), and would have
  broken the Electron app's own migrations on the very next `npm run
  build` even without this phase's new code ever running. Fixed by
  having each entry point (`main/index.ts`, `mcp/server.ts`) resolve the
  migrations folder from its own `__dirname` and pass it into
  `runMigrations(migrationsFolder)` as a parameter, instead of `migrate.ts`
  computing it internally.
- `db/client.ts` and `db/migrate.ts` no longer import Electron's `app`
  module at all - both now resolve the db file path through
  `@shared/paths`' `getStandaloneAppDataDir()` (already scaffolded in
  Phase 1 for exactly this), which is plain-Node path math
  (`process.env.APPDATA`) instead of `app.getPath('userData')`. This is
  what makes every existing repo function (`projectsRepo.ts`,
  `walksRepo.ts`, etc.) directly reusable, unmodified, by both the
  Electron app and the standalone MCP process - one set of business
  logic, two callers.

### Verified
- Per the standing instruction - no computer-use click-through this
  phase either. Verified via:
- `npx tsc --noEmit` clean on `tsconfig.node.json` (covers `src/mcp` too)
  and `tsconfig.web.json`.
- `npx vitest run` - 12/12 passing, unchanged.
- `npm run build` succeeds; new `out/main/mcp.js` (~11KB) builds
  alongside `out/main/index.js`.
- A real end-to-end MCP client smoke test (the SDK's own `Client` +
  `StdioClientTransport`, driven through `scripts/run-mcp.js` exactly as
  a real connector would): connected, listed all 38 tools, called
  `get_settings` and `list_projects` against the actual live database
  (not test data) and got real data back - "Watts Construction",
  "Bryce Stroud", "Tech Ridge #3" - proving it reads the same live file
  the Electron app does. Write tools were not exercised against the live
  DB (didn't want to mutate real data without you around to check it);
  they're the same repo functions the already-verified IPC layer already
  uses, just called directly.
- The batch/composite tools were different: those needed a real write
  test, so a second automated smoke test ran against a throwaway scratch
  database (a temp-dir APPDATA override, never the live file) exercising
  `record_walk`, `batch_set_item_scores`, `batch_create_action_items`,
  `batch_transition_action_items`, and the atomicity guarantee (one bad
  item in a 3-item batch -> zero rows land). All passed.
- Bryce, please try connecting this to Claude yourself before relying on
  it: `npm run build` once, then point your MCP client at `node
  scripts/run-mcp.js` per the README's MCP section, and try a couple of
  write tools (e.g. create a test action item) so you've seen a real
  write path work, not just my read-only smoke test above.

## Phase 7 — Backup, Export & Legacy Import (2026-09-25)

### Added
- Automatic daily backup (checked once on app start, only runs if the
  last backup is >24h old) plus a backup on every app close/quit -
  both use better-sqlite3's online `.backup()` API so a backup taken
  mid-write during WAL mode is never corrupt, unlike a raw file copy.
  Backups live in `Documents/GS Dashboard Backups` by default (or a
  folder the GS picks in Settings), newest 30 kept, older pruned
  automatically.
- Settings > Backup & Data panel: Back Up Now, a table of existing
  backups with a Restore action per row (confirmation dialog, takes one
  more safety backup of current data first, then relaunches the app).
- Export all data to JSON / Import from JSON - a full-app snapshot of
  every table, for moving the whole DB to another machine or keeping an
  external copy. Import is a full replace (all tables cleared and
  reloaded inside one transaction), gated behind a shape-validated
  preview and a confirmation dialog, with a safety backup taken first.
- Legacy Prototype Import - one-time importer for the old web
  prototype's JSON export. Pick file -> preview (counts + unmatched-
  checklist-item warnings) -> confirm -> commit. Checklist items are
  matched to the seeded list by text; anything unmatched becomes an
  inactive custom item in its stated category so historical walk scores
  still resolve without cluttering the active checklist. Uses
  deterministic SHA1-derived IDs throughout so re-running the same file
  twice is a no-op instead of duplicating data.

### Decisions made without asking again
- No real sample of the legacy prototype's export was ever provided
  (Phase 1 answer was "No existing data - start fresh"), so the shape
  `legacyImport.ts` parses (`{ supers, projects, walks, actions? }`) is
  inferred from the build spec's own description, not verified against
  a real file. If Bryce's friend's actual export doesn't match, the
  importer returns a clear "doesn't match the expected shape, tell
  Bryce the actual structure" error instead of guessing further or
  silently importing garbage - flagging this explicitly rather than
  presenting it as tested.
- JSON import is a full replace, not a merge - matches what "Import"
  implies for a single-user local app restoring/migrating a whole
  dataset, and avoids the much larger ambiguity of merge/conflict
  resolution the spec never specified.

### Verified
- Per the standing instruction to stop driving this app with
  computer-use and just build - no click-through verification this
  phase. Verified statically only:
- `npx tsc --noEmit` clean on both `tsconfig.node.json` (main/preload)
  and `tsconfig.web.json` (renderer).
- `npx vitest run` - 12/12 passing, unchanged from prior phases (this
  phase touched no scoring logic).
- `npm run build` succeeds end to end; preload bundle grew from ~107KB
  to ~119KB, consistent with the new IPC methods being bundled in.
- Bryce, please click through this one yourself: Settings > Backup &
  Data - Back Up Now, look at the backups list, try Export to JSON,
  and if you've got a real legacy export file, try that flow too
  before trusting it on real data.

## Phase 6 — Reports & PDF (2026-09-25)

### Added
- Full and Executive Summary weekly reports (week-starting picker
  defaulting to this Monday, Live badge for the current week, paper-
  style preview): red flags (Safety <=2, Schedule <=2, any category <3),
  escalated items marked Include-in-report, per-walk sections with full
  scores and notes for Full, and a 3-5-note checkbox picker (not
  enforced) pulled from that week's walk notes for Executive.
- PDF export via real "dedicated print routes" (`/print/walk/:id`,
  `/print/report/:type/:weekStart`) - no sidebar, white/black print
  styling - that a hidden BrowserWindow loads and signals ready over a
  new `PRINT_MARK_READY` IPC message before `webContents.printToPDF`
  runs. Native save dialog remembers the last folder used (its own
  setting, separate from the DB backup folder).
- Every export saves a `report_snapshots` row (per the Phase 1 "save
  each week's report" answer), surfaced as a Past Reports list with an
  Open PDF action.
- Wired up the walk-level Export PDF that Phase 3 (Job Walk submit
  summary) and Phase 5 (Superintendent Detail history) both left
  disabled as "Coming in Phase 6" stubs.
- New `EmailWalkDialog` for Job Walk's "Email to…" - opens a pre-filled
  mailto draft; can't attach the PDF automatically since mailto has no
  attachment mechanism, so it tells the GS to attach it themselves.

### Decisions made without asking again
- mailto can't carry attachments - a hard platform limitation, not a
  shortcut. Both "Email to…" (walk) and the earlier escalation email
  from Phase 3/4 share this constraint; flagging it here since Reports
  has no equivalent email button at all for the same reason - "Export
  PDF" then attach-and-send-yourself is the only honest option without
  building real SMTP (which the Phase 1 answer explicitly deferred).
- Red flag thresholds apply per walk, not aggregated across the week -
  matches spec 5.5's literal wording ("Safety <=2, Schedule <=2, any
  category <3") rather than inventing a company-wide aggregate.

### Verified
- Live against real user data already in the app (not test data):
  exported all three PDF types (Full, Executive, single Walk), read
  each back with the PDF-reading tool to confirm correct company name,
  scores, color-coding, and section structure.
- Confirmed the save-folder is remembered across exports, the Past
  Reports list and Open PDF both work, and the Email dialog renders
  correctly (including the empty-recipients state) without erroring.
- Found a leftover bug from Phase 5 while wiring this up: Superintendent
  Detail's walk-history PDF button used a Mail icon instead of FileText
  - fixed as part of this phase's edit to that button.
- `npm run typecheck`, `npm test` (12/12), `npm run build` all pass.

## Phase 5 — Dashboard & Superintendent Detail (2026-09-25)

### Added
- Dashboard: stat tiles (Active Supers, Walks This Week, Avg Score for
  the selected range, Open Action Items, Overdue), a date-range selector
  (This Week / Last 30 / Last 90 [default] / YTD / All Time), a Needs
  Attention strip (no walk within Settings' configurable threshold, or
  any category average under 3.0), and a sortable matrix (one row per
  active super, one column per category plus Overall when weighted
  scoring is on, sticky name column, horizontal scroll for all 13
  categories). Row click opens Superintendent Detail.
- Superintendent Detail: profile header (contact, home project, NCCER,
  custom fields) with Edit, all-time category chips, a trend chart
  (Overall always shown, pick one category to compare), walk history
  table, and that super's open action items. Clicking a walk in history
  deep-links into the Job Walk editor via a new `?walk=` param.
- `SuperintendentFormModal` extracted out of Superintendents.tsx into a
  shared component so Detail's Edit button reuses it instead of
  duplicating the form.

### Decisions made without asking again
- Matrix category averages are "average of that super's walk-level
  category scores over the selected range" per spec section 4 literally
  - computed as categoryScore per walk, then unweightedAverage across
    walks in range, reusing the same shared/scoring.ts functions the Job
    Walk screen already uses. No new scoring logic was written.
- "Last walk date" and the Needs Attention threshold use the super's
  most recent walk overall, not range-restricted - a walk from before
  the selected range still counts for "no walk in N days."
- Trend chart shows one compare-category line at a time rather than all
  13 at once (unreadable at that count); Overall is always plotted.

### Verified
- Live in the Electron window (before a mid-session usage-limit
  interruption): matrix picked up a submitted walk's scores correctly,
  Needs Attention flagged a sub-3.0 category, the Overall column
  computed correctly, and the walk-history deep link opened the right
  walk in the Job Walk editor.
- After resuming: typecheck, `npm test` (12/12), and `npm run build`
  all still pass. Confirmed via a read-only DB check (no writes) that
  real project/superintendent data entered during the gap was untouched
  by anything done in this session.

## Phase 4 — Action Items + walk archive (2026-09-24)

### Added
- Full Action Items screen: status tabs (Open/Overdue/Escalated/Closed/
  All), filters (project, super, owner, priority) and text search.
- Stat tiles: Open, Overdue, Escalated, Closed this week.
- Inline actions per row: Close, Carry, Escalate (shared dialog from
  Phase 3, now reusable outside a walk), De-escalate (new dialog, with
  an optional resolution note), Reopen for closed items, Edit, and
  Delete with a confirmation dialog.
- "Include in report" toggle, shown for escalated items per spec.
- History drawer reading `action_item_events`, with notified people's
  names resolved instead of raw IDs.
- Manual "Add" action item from anywhere, not just mid-walk.
- Walk archive: closes the gap flagged in the Phase 3 check-in. Walks
  are now soft-deletable (`Archive` in the walk editor header), same
  confirm-dialog pattern as projects/superintendents.

### Decisions made without asking again
- "Delete" for an action item is a soft-delete (`deleted_at`), same as
  everywhere else in the app, even though spec 3's soft-delete list
  doesn't explicitly name action_items. Kept it reversible-in-principle
  rather than a true hard delete, consistent with the app's general
  caution around destructive actions; the confirmation copy still says
  "can't be undone from the app" since there's no restore UI.
- Reopen (for closed items) wasn't explicitly asked for in spec 5.4's
  button list, but the schema/backend already supported it via the
  existing event enum, so it's exposed - matches section 8's "undo... is
  nice to have."
- "Add from text/email (AI)" is not built - stays Phase 8 per the phase
  table, same reasoning as the Job Walk AI-scan omission.

### Verified
- Full lifecycle live in the Electron window: create -> escalate ->
  check history -> de-escalate -> edit due date -> close -> confirm
  stat tiles update at each step -> delete with confirmation.
- Escalate dialog renders and behaves identically whether opened from
  Job Walk (with a walkId) or Action Items (without one).
- Walk archive removes a walk from Recent Walks immediately.
- `npm run typecheck`, `npm test` (12/12), `npm run build` all pass.

## Phase 3 — Job Walk (2026-09-24)

### Added
- Full Job Walk workflow: start-a-walk picker (superintendent/project/date/
  visit type, with home-project auto-switch you can still override) plus
  a recent-walks list to reopen drafts or submitted walks.
- Collapsible category sections with live category scores, 1-5/N/A
  scoring (44px+ touch targets), due-item highlighting driven by real
  cross-walk history rather than the calendar-only logic the prototype
  had (spec bug #8) — monthly/once-per-job frequencies now check actual
  score history for that super/project pair.
- "Mark all remaining N/A" and "Copy scores from last walk" (per your
  Phase 1 answer), both working across the whole walk, not per-category.
- Per-category notes, overall notes, and follow-up notes, each saving on
  blur and again on a 10s interval if left dirty.
- Keyboard shortcuts: 1-5 scores the focused item and N marks it N/A,
  both advancing focus to the next item automatically.
- Step mode: one category at a time with Previous/Next, for tablet use.
- Open action item review gate: every open/carried item for that super/
  project (from *prior* walks — items you add during the current walk
  don't loop back and block themselves) must be closed, carried, or
  escalated before Submit unlocks. Escalate opens a dialog that logs the
  event and, per your mailto decision, opens a pre-filled email to
  whichever People you check.
- New action items addable mid-walk (owner, due date defaulting +7 days,
  priority) — hinted at 3-5, never enforced.
- Editing an already-submitted walk is allowed; shows a banner and logs
  `lastEditedAt`. Export PDF / Email to... are visible but disabled with
  a "Phase 6" tooltip since PDF export doesn't exist yet.
- Backend: `walksRepo` and the Job-Walk-only slice of `actionItemsRepo`
  (list-open-for-super-project, create, transition+event-log). The full
  Action Items screen with filters/history drawer is still Phase 4, built
  on this same backend.

### Decisions made without asking again
- AI-suggested action items from scanning walk notes: not built - that's
  explicitly Phase 8 per the phase table, so Job Walk has no AI call yet.
- "Save Draft" flushes the overall/follow-up notes fields immediately;
  category notes already autosave independently (blur + 10s interval) so
  they don't need a second flush path.
- No walk delete/archive exists yet - spec's Job Walk section never asks
  for one, only editing. Flagging it since I hit the gap firsthand while
  cleaning up test data (had to delete rows directly since there's no UI
  path) - worth a quick decision at the Action Items or Dashboard phase
  check-in about whether walks ever need to be removable.

### Verified
- Two full walks end to end in the real Electron window: one submitted
  (PDF/Email buttons correctly disabled, banner correct), one left as a
  draft (shows in Recent Walks with the right badge).
- Copy-from-last pulled all 62 scores correctly from walk 1 into walk 2.
- Keyboard shortcuts (1-5, N) score and advance focus correctly.
- An action item created in walk 1 correctly blocked Submit on walk 2
  until escalated; escalating cleared the gate and Submit unlocked.
- `npm run typecheck`, `npm test` (12/12), `npm run build` all pass.

### Correction to the Phase 1 changelog entry
While testing this phase I found two dev-mode bugs — preload couldn't
bundle `zod` under `sandbox: true` (needs bundling, not
`externalizeDepsPlugin`), and the dev-mode CSP blocked Vite's React
Refresh preamble script. Both were actually fixed during Phase 1's own
verification, before that commit — an earlier draft of this entry
mistakenly implied they were new to Phase 3. Correcting that here.

### Also caught during this phase (unrelated to the app)
A computer-use clipboard race pasted the wrong text into a project name
field during manual testing (created a garbage test project). Confirmed
with you, cleaned up via the app's own archive flow — not an app bug,
just a note in case you see "clipboard" come up if you ever read back
through session history.

## Phase 2 — Setup Data (2026-09-24)

### Added
- Projects: full CRUD (name, number, PM name/email, address, status),
  search, archive (soft-delete only, per spec 5.6 — history stays intact).
- Superintendents: full CRUD (contact info, years experience, home project,
  NCCER status, notes, active flag) plus a custom-fields editor (add/remove
  label-value pairs, stored in `super_custom_fields`). Archive works the
  same as projects.
- Settings > People: CRUD for report recipients/escalation contacts (name,
  title, email, role, full-report/exec-summary flags). Hard-deletable per
  spec — no history references a person directly.
- Settings > Checklist: per-category weight editing with a live banner
  warning when weighted categories don't total 100%; per-item rename,
  frequency change, activate/deactivate, reorder (up/down), and add custom
  items. Deactivating an item never deletes it, matching spec 3's note
  about not losing history from already-scored items.
- Shared UI: `Modal`, `ConfirmDialog`, `FormField` components reused across
  all three CRUD screens.

### Verified
- Full create → edit → archive/remove cycle tested for Projects,
  Superintendents (incl. custom field round-trip through IPC/SQLite),
  and People, live in the Electron window.
- Checklist weight-warning banner confirmed to flip color at the right
  threshold; item reorder and add-item confirmed to persist and re-render.
- `npm run typecheck`, `npm test` (12/12), `npm run build` all pass.
- Test data created during verification was cleaned up afterward (archived/
  removed through the app's own UI, not by hand-editing the DB).

### Not done yet (later phases, not needed for Phase 2's own criteria)
- No hard-delete anywhere by design — matches spec's soft-delete rule for
  projects/superintendents/walks; checklist items are deactivate-only.
- Drag-and-drop reordering was skipped in favor of up/down buttons — same
  end result, simpler and more reliable; revisit only if it feels slow in
  real use.

## Phase 1 — Foundation (2026-09-24)

Scaffolded the desktop app per the build spec.

### Added
- Electron + electron-vite + React 18 + TypeScript, Tailwind CSS.
- SQLite via better-sqlite3 + Drizzle ORM, with the full Section 3 schema
  (13 tables) and a generated initial migration.
- Appendix A seed data (13 categories, all checklist items, weekly
  frequency) auto-seeded on first run. Company-specific item text uses a
  `{{COMPANY}}` placeholder rendered from Settings, never hardcoded.
- Secure preload bridge: `contextIsolation: true`, `nodeIntegration: false`,
  `sandbox: true`, typed IPC via a single `ipc-contract.ts` (zod-validated).
- Strict CSP in production builds (relaxed only in dev, where Vite's React
  Refresh needs an inline script it would otherwise block).
- App shell: sidebar, top bar, dark/light/system theme using the full design
  token system from the brand spec (industrial dark-first palette, IBM Plex
  typography, restrained score-band colors).
- First-launch onboarding screen (company name, GS name, brand colors) —
  no hardcoded company/person data anywhere, per spec rule 3.
- Pure scoring module (`src/shared/scoring.ts`) with unit tests: category
  averages, score bands, weighted + unweighted overall score, history-based
  due-date logic (weekly/monthly/once-per-job), overdue logic.
- Placeholder screens for every nav destination (Dashboard, Job Walk, Action
  Items, Reports, Superintendents, Projects, Procore, Settings) so the full
  shell and navigation exist even before their phases build real content.
- Temporary debug page (`/debug/seed`) verifying seed data — will be removed
  once Phase 2 gives Superintendents/Projects real screens.
- `report_snapshots` table added beyond the spec's base schema, since you
  asked for finished reports to be reopenable as-sent (Phase 6 will use it).

### Decisions made without asking again (flagging per spec rule 1)
- Single-user, no login — spec's stated default, not re-asked.
- AI extraction features (paste-to-extract, walk-note scan) assumed **on**
  by default per spec's recommended option, since your clarifying answer
  was about a separate MCP-for-Claude-Desktop feature, not this one. Toggle
  lives in Settings > AI once Phase 8 builds it; confirm this assumption is
  right at that check-in.

### Known environment issue
- `npm run build:win` (the NSIS installer) needs Windows Developer Mode or
  an elevated terminal on this machine — electron-builder's code-signing
  tooling archive needs symlink creation, which Windows blocks otherwise.
  Not a project bug. `npm run build` (unpacked app) works today.

### Verified
- `npm run typecheck`, `npm test` (12/12 passing), `npm run build` all pass.
- App launches, runs onboarding, persists settings through real IPC/SQLite,
  shows seeded categories/items correctly, theme switching works, all
  screenshotted end-to-end in the actual Electron window (not just the dev
  server tab).
