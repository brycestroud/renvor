/**
 * In-app updates from GitHub Releases (electron-updater). Nothing installs
 * without a click: the app checks quietly, shows an "Update available"
 * button, and only downloads/installs when the user presses it.
 *
 * Release side (see README > Releasing): a new version is a GitHub Release
 * containing the installer, its .blockmap and latest.yml - the workflow in
 * .github/workflows/release.yml builds and uploads those when a v* tag is
 * pushed. Where releases live is set in electron-builder.yml's `publish`.
 */
import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateStatus } from '@shared/ipc-contract'
import { markQuitting } from './phone/background'
import { logError, logInfo } from './logger'

const CHECK_EVERY_MS = 6 * 60 * 60 * 1000
const FIRST_CHECK_DELAY_MS = 15 * 1000

// Test hook: point the updater at a local feed instead of GitHub.
const FEED_OVERRIDE = process.env.RENVOR_UPDATE_FEED_URL || null

const supported = app.isPackaged || FEED_OVERRIDE !== null

let status: UpdateStatus = {
  state: supported ? 'idle' : 'unsupported',
  currentVersion: app.getVersion(),
  latestVersion: null,
  percent: null,
  releaseNotes: null,
  error: null,
  lastCheckedAt: null
}
let initialized = false
let installRequested = false

function set(patch: Partial<UpdateStatus>): void {
  status = { ...status, ...patch }
}

function notesToText(notes: unknown): string | null {
  if (typeof notes === 'string') return notes.replace(/<[^>]+>/g, '').trim() || null
  if (Array.isArray(notes)) {
    const text = notes
      .map((n) => (n && typeof n === 'object' && 'note' in n ? String((n as { note: unknown }).note ?? '') : ''))
      .join('\n')
      .replace(/<[^>]+>/g, '')
      .trim()
    return text || null
  }
  return null
}

export function initUpdater(): void {
  if (!supported || initialized) return
  initialized = true

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.allowPrerelease = false
  autoUpdater.logger = null
  if (FEED_OVERRIDE) {
    autoUpdater.forceDevUpdateConfig = true
    autoUpdater.setFeedURL({ provider: 'generic', url: FEED_OVERRIDE })
  }

  autoUpdater.on('checking-for-update', () => set({ state: 'checking', error: null }))
  autoUpdater.on('update-available', (info) => {
    logInfo(`Update available: ${info.version}`)
    set({
      state: 'available',
      latestVersion: info.version,
      releaseNotes: notesToText(info.releaseNotes),
      percent: null,
      lastCheckedAt: new Date().toISOString()
    })
  })
  autoUpdater.on('update-not-available', () =>
    set({ state: 'up-to-date', latestVersion: null, lastCheckedAt: new Date().toISOString() })
  )
  autoUpdater.on('download-progress', (p) =>
    set({ state: 'downloading', percent: Math.round(p.percent) })
  )
  autoUpdater.on('update-downloaded', () => {
    logInfo('Update downloaded')
    set({ state: 'downloaded', percent: 100 })
  })
  autoUpdater.on('error', (error) => {
    logError('Updater error', error)
    set({
      state: 'error',
      error: error instanceof Error ? error.message : String(error),
      lastCheckedAt: new Date().toISOString()
    })
  })

  setTimeout(() => void checkForUpdates(true), FIRST_CHECK_DELAY_MS)
  setInterval(() => void checkForUpdates(true), CHECK_EVERY_MS).unref()
}

export function getUpdateStatus(): UpdateStatus {
  return status
}

/** `quiet` = background check: a network failure shouldn't put an error banner in front of the user. */
export async function checkForUpdates(quiet = false): Promise<UpdateStatus> {
  if (!supported) return status
  if (['checking', 'downloading', 'downloaded'].includes(status.state)) return status
  try {
    await autoUpdater.checkForUpdates()
  } catch (error) {
    if (quiet) set({ state: 'idle', lastCheckedAt: new Date().toISOString() })
    else if (status.state !== 'error') {
      set({ state: 'error', error: error instanceof Error ? error.message : String(error) })
    }
  }
  return status
}

export async function downloadUpdate(): Promise<UpdateStatus> {
  if (!supported || status.state !== 'available') return status
  set({ state: 'downloading', percent: 0, error: null })
  try {
    await autoUpdater.downloadUpdate()
  } catch (error) {
    set({ state: 'error', error: error instanceof Error ? error.message : String(error) })
  }
  return status
}

export function installUpdate(): UpdateStatus {
  if (!supported || status.state !== 'downloaded' || installRequested) return status
  installRequested = true
  set({ state: 'installing' })
  // Silent install + relaunch; markQuitting so the close-to-tray handler
  // doesn't swallow the shutdown the installer is waiting for.
  markQuitting()
  autoUpdater.quitAndInstall(true, true)
  return status
}
