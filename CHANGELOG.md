# Changelog

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
