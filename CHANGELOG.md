# Changelog

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
