# Changelog

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
