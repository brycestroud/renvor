import { defineConfig } from '@playwright/test'

// Electron E2E smoke test (build spec Section 8). Drives the real built app
// (out/main/index.js etc - run `npm run build` first), not a browser.
// No webServer/browser project config needed: e2e/smoke.spec.ts launches
// Electron itself via `_electron.launch()`.
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list'
})
