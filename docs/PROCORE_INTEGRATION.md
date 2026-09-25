# Procore Integration - Where to Plug In the Real Client

Phase 9 built the *scaffolding* only, per the build spec's explicit "don't
build the integration yet." Nothing here talks to the real Procore API.
This doc is for whoever (Bryce, or Bryce's future self) does that work.

## What exists today

- `src/main/integrations/procore/types.ts` - the `ProcoreClient` interface,
  typed exactly as specified in the build spec (Section 7): `isConnected`,
  `listProjects`, `listDailyLogs`, `listObservations`, `listInspections`.
- `src/main/integrations/procore/mockClient.ts` - `MockProcoreClient`, a
  deterministic fake implementation so the UI has something realistic to
  render and test against.
- `src/main/integrations/procore/index.ts` - `getProcoreClient()`, the
  **single factory function** every caller in the app goes through. This is
  the one place that needs to change to plug in a real client.
- `settings.procoreEnabled` (boolean, default `false`) - gates the mock-data
  UI (the "Procore this week" panel on Job Walk, the "Import from Procore"
  button on Action Items, and the Procore ID fields on Project/Superintendent
  forms). Toggle it from the Procore page in the app.
- `projects.procoreProjectId` / `projects.procoreCompanyId` /
  `superintendents.procoreUserId` - nullable columns already in the schema
  (Phase 1), now editable from the UI (Phase 9) while `procoreEnabled` is on.
  These are how a local project/superintendent maps to a specific Procore
  project + person - the "specific job + specific person" scoping the build
  spec calls for.

## What plugging in the real client looks like

1. **Implement `ProcoreClient` for real**, e.g.
   `src/main/integrations/procore/realClient.ts`, calling Procore's actual
   REST API (`https://api.procore.com/...`) instead of returning fake data.
   Keep the same method signatures - nothing else in the app should need to
   change if the interface is honored.
2. **Update `getProcoreClient()`** in `index.ts` to return the real client
   once it's configured (e.g. check whether an access token exists in
   storage; fall back to `MockProcoreClient` or throw a clear "not connected"
   error otherwise). This is intentionally the *only* file that decides which
   implementation is active.
3. **Network calls stay in the main process**, never the renderer - this is
   a hard rule from the build spec's security section, not a suggestion. Add
   new IPC channels (following the pattern in `src/main/ipc/procoreRepo.ts` -
   it already proxies through `getProcoreClient()`, so it shouldn't need
   changes) rather than having the renderer call Procore directly.

## Credentials and OAuth (not built yet)

The build spec calls for:

- **Token storage via Electron's `safeStorage`** (OS keychain encryption),
  not the SQLite `settings` table in plaintext. `safeStorage` isn't used
  anywhere in this codebase yet - see
  [Electron's `safeStorage` docs](https://www.electronjs.org/docs/latest/api/safe-storage)
  for `encryptString`/`decryptString`. Store the encrypted token as a file
  in `app.getPath('userData')`, or as a settings value if you base64-encode
  the encrypted buffer - either works, but never store the raw token.
- **OAuth authorization-code flow, run in the main process.** Procore's
  OAuth docs: <https://developers.procore.com/documentation/oauth-introduction>.
  Rough shape: open Procore's authorize URL in a `BrowserWindow` (or the
  system browser via `shell.openExternal`, with a local redirect listener),
  exchange the returned code for an access + refresh token server-side (in
  main, via `fetch`), then encrypt and store the tokens.
- **No client ID or secret in source code, ever** - this is exactly the bug
  the original prototype had (Section 10, bug #1: "Procore client secret
  hard-coded in the page"). The client ID can be a build-time constant if
  Procore issues one per app; the client *secret* (if Procore's app type
  requires one) must be entered by Bryce at runtime and encrypted at rest,
  the same way the AI API key question was answered for a different feature.

## Where real data would need to reach the UI

These are the two spots Phase 9 already wired up against mock data - a real
client should need zero changes here, since they go through
`src/main/ipc/procoreRepo.ts` → `getProcoreClient()`:

- **Job Walk's "Procore this week" panel**
  (`src/renderer/src/pages/jobwalk/ProcorePanel.tsx`, fetched via
  `IPC.PROCORE_GET_WALK_PANEL_DATA`) - daily logs, observations, and
  inspections for the walk's project + superintendent, for the walk's week.
  Also feeds a small hint next to the "Daily reports filled out fully with
  quality photos" checklist item
  (`src/renderer/src/pages/jobwalk/CategorySection.tsx`).
- **Action Items' "Import from Procore" button**
  (`src/renderer/src/pages/actionitems/ImportProcoreObservationsDialog.tsx`,
  via `IPC.PROCORE_LIST_OPEN_OBSERVATIONS` /
  `IPC.PROCORE_IMPORT_OBSERVATIONS`) - lets the GS pick open observations for
  a project and creates them as action items with `source: 'procore'`.

## Testing without a real Procore account

Turn `procoreEnabled` on from the Procore page - every UI surface above
renders with `MockProcoreClient`'s data, so the layout, empty states, and
import flow can all be reviewed before a real Procore developer app exists.
