import { existsSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test'

/**
 * Build-spec Section 8 smoke test, run against the real built app (not a
 * mock): create a project -> create a super -> complete and submit a walk
 * -> an action item appears -> the report shows the walk -> PDF export
 * produces a file.
 *
 * Requires `npm run build` first (this launches out/main/index.js, not
 * dev-server source). Runs against a scratch APPDATA directory - a fresh
 * database every run, never the real one.
 */

let electronApp: ElectronApplication
let page: Page
let scratchAppData: string
let pdfPath: string

test.beforeAll(async () => {
  scratchAppData = mkdtempSync(join(tmpdir(), 'gs-e2e-'))
  pdfPath = join(scratchAppData, 'export-test.pdf')

  const mainEntry = join(__dirname, '..', 'out', 'main', 'index.js')
  if (!existsSync(mainEntry)) {
    throw new Error(`${mainEntry} not found - run "npm run build" before the e2e suite.`)
  }

  electronApp = await electron.launch({
    args: [mainEntry],
    env: { ...process.env, APPDATA: scratchAppData, NODE_ENV: 'production', PLAYWRIGHT_TEST: '1' }
  })
  page = await electronApp.firstWindow()
  await page.waitForLoadState('domcontentloaded')

  // Stub the native save dialog so PDF export doesn't need a human at a file
  // picker - resolves to a fixed path in the scratch dir instead.
  await electronApp.evaluate(async ({ dialog }, targetPath) => {
    dialog.showSaveDialog = (async () => ({ canceled: false, filePath: targetPath })) as typeof dialog.showSaveDialog
  }, pdfPath)
})

test.afterAll(async () => {
  await electronApp?.close()
  rmSync(scratchAppData, { recursive: true, force: true })
})

test('create project -> super -> submit walk -> action item -> report -> PDF export', async () => {
  // --- Onboarding (first launch, fresh scratch db) ---
  await page.getByPlaceholder('Acme Construction').fill('Smoke Test Co')
  await page.getByPlaceholder('Full name').fill('Test GS')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()

  // --- Create a project ---
  await page.getByRole('link', { name: 'Projects' }).click()
  await page.getByRole('button', { name: 'New Project' }).click()
  await page.getByPlaceholder('Riverside Medical Center').fill('E2E Test Project')
  await page.getByRole('button', { name: 'Create project' }).click()
  await expect(page.getByText('E2E Test Project')).toBeVisible()

  // --- Create a superintendent, home project = the one above ---
  await page.getByRole('link', { name: 'Superintendents' }).click()
  await page.getByRole('button', { name: 'New Superintendent' }).click()
  await page.getByPlaceholder('Full name').fill('E2E Test Super')
  await page.getByLabel('Home project').selectOption({ label: 'E2E Test Project' })
  await page.getByRole('button', { name: 'Create superintendent' }).click()
  await expect(page.getByText('E2E Test Super')).toBeVisible()

  // --- Start and complete a walk ---
  await page.getByRole('link', { name: 'Job Walk' }).click()
  await page.getByLabel('Superintendent').selectOption({ label: 'E2E Test Super' })
  await page.getByLabel('Project').selectOption({ label: 'E2E Test Project' })
  await page.getByRole('button', { name: 'Start Walk' }).click()
  await expect(page.getByRole('heading', { name: 'Job Walk' })).toBeVisible()

  await page.getByRole('button', { name: 'Mark all remaining N/A' }).click()

  const actionItemText = 'E2E follow up on punch list'
  await page.getByPlaceholder('New action item…').fill(actionItemText)
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByText('Added this walk')).toBeVisible()
  await expect(page.getByText(actionItemText)).toBeVisible()

  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('Editing submitted walk')).toBeVisible()

  // --- Action item appears on the Action Items screen ---
  await page.getByRole('link', { name: 'Action Items' }).click()
  await expect(page.getByText(actionItemText)).toBeVisible()

  // --- The report shows the walk (this week's default report includes it) ---
  await page.getByRole('link', { name: 'Reports' }).click()
  await expect(page.getByText(/1 walk this week/)).toBeVisible()

  // --- PDF export produces a file ---
  await page.getByRole('button', { name: 'Export PDF' }).click()
  await expect(page.getByText(`Saved to ${pdfPath}`)).toBeVisible({ timeout: 15_000 })
  expect(existsSync(pdfPath)).toBe(true)
})
