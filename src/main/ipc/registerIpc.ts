import { ipcMain, app, shell } from 'electron'
import { join } from 'path'
import {
  IPC,
  setManySettingsInput,
  createProjectInput,
  updateProjectInput,
  createSuperintendentInput,
  updateSuperintendentInput,
  createPersonInput,
  updatePersonInput,
  updateCategoryWeightInput,
  createChecklistItemInput,
  updateChecklistItemInput,
  reorderChecklistItemsInput,
  createWalkInput,
  updateWalkHeaderInput,
  setItemScoreInput,
  markAllRemainingNaInput,
  setCategoryNoteInput,
  copyFromLastWalkInput,
  getItemHistoryInput,
  submitWalkInput,
  listOpenActionItemsInput,
  createActionItemInput,
  updateActionItemInput,
  transitionActionItemInput,
  getActionItemEventsInput,
  getMatrixInput,
  getWeekReportInput,
  getExecSummaryDataInput,
  exportExecSummaryPdfInput,
  exportWalkPdfInput,
  restoreBackupInput,
  jsonImportCommitInput,
  legacyImportCommitInput,
  getProcoreWalkPanelDataInput,
  listProcoreOpenObservationsInput,
  importProcoreObservationsInput
} from '@shared/ipc-contract'
import { getAllSettings, setManySettings } from './settingsRepo'
import { listProjects, createProject, updateProject, archiveProject } from './projectsRepo'
import {
  listSuperintendents,
  createSuperintendent,
  updateSuperintendent,
  archiveSuperintendent
} from './superintendentsRepo'
import { listPeople, createPerson, updatePerson, deletePerson } from './peopleRepo'
import { listCategoriesWithItems, updateCategoryWeight } from './categoriesRepo'
import {
  createChecklistItem,
  updateChecklistItem,
  reorderChecklistItems
} from './checklistItemsRepo'
import {
  listRecentWalks,
  getWalk,
  createWalk,
  updateWalkHeader,
  setItemScore,
  markAllRemainingNa,
  setCategoryNote,
  copyFromLastWalk,
  getItemHistory,
  submitWalk,
  archiveWalk
} from './walksRepo'
import {
  listOpenActionItemsForSuperProject,
  listAllActionItems,
  createActionItem,
  updateActionItem,
  transitionActionItem,
  deleteActionItem,
  getActionItemEvents
} from './actionItemsRepo'
import { getMatrix, getSuperintendentWalkHistory } from './dashboardRepo'
import { getWeekNotes, getFullReportData, getExecSummaryData, listReportSnapshots, getSnapshotPdfPath } from './reportsRepo'
import { exportWalkPdf, exportFullReportPdf, exportExecSummaryPdf } from '../pdf/printExport'
import { performBackup, listBackups, restoreFromBackup } from '../backup/backupManager'
import { exportJson, importJsonPick, importJsonCommit } from '../backup/jsonBackup'
import { legacyImportPickAndPreview, legacyImportCommit } from '../backup/legacyImport'
import { getProcoreWalkPanelData, listProcoreOpenObservations, importProcoreObservations } from './procoreRepo'
import { ensureLogsDir } from '../logger'
import { getMcpHttpUrl, getMcpHttpStatus, isCertTrusted } from '../mcp/httpServer'
import { getMcpCertFilePath } from '../mcp/cert'
import { getPhoneInfo, setPhoneAccess, resetPhoneLink, setPhoneAutostart } from '../phone/phoneServer'
import { getCustomizeInfo, openCustomizeSource } from '../customize/customize'
import { getUpdateStatus, checkForUpdates, downloadUpdate, installUpdate } from '../updater'

type Handler = (event: unknown, payload: any) => unknown
const handlers = new Map<string, Handler>()

/** Registers on Electron IPC AND records it so the phone web server can call the same logic. */
function handle(channel: string, fn: Handler): void {
  handlers.set(channel, fn)
  ipcMain.handle(channel, fn as Parameters<typeof ipcMain.handle>[1])
}

// Channels that need a native dialog / the OS shell / this computer's config -
// meaningless (or unsafe) when the caller is a phone browser.
const PHONE_BLOCKED_PREFIXES = ['backup:', 'legacyImport:', 'logs:', 'mcp:', 'phone:', 'customize:', 'update:']
const PHONE_BLOCKED_CHANNELS = new Set<string>([
  IPC.REPORTS_EXPORT_FULL_PDF,
  IPC.REPORTS_EXPORT_EXEC_PDF,
  IPC.REPORTS_OPEN_SNAPSHOT_PDF,
  IPC.WALKS_EXPORT_PDF
])

export function isPhoneAllowedChannel(channel: string): boolean {
  return (
    !PHONE_BLOCKED_CHANNELS.has(channel) &&
    !PHONE_BLOCKED_PREFIXES.some((prefix) => channel.startsWith(prefix))
  )
}

export async function invokeHandlerForPhone(channel: string, payload: unknown): Promise<unknown> {
  if (!isPhoneAllowedChannel(channel)) {
    throw new Error('This action is only available in the desktop app.')
  }
  const fn = handlers.get(channel)
  if (!fn) throw new Error(`Unknown action: ${channel}`)
  return fn(null, payload)
}

/**
 * projectRoot must be resolved by the caller from ITS OWN __dirname, not
 * computed in here - this module could end up in a shared Rollup chunk one
 * directory deeper than the entry file if it's ever imported from more than
 * one build entry (this bit main/db/migrate.ts for real in Phase 10 - see
 * that file's comment for the full story).
 */
export function registerIpcHandlers(projectRoot: string): void {
  handle(IPC.APP_GET_VERSION, () => app.getVersion())

  handle(IPC.SETTINGS_GET_ALL, () => getAllSettings())
  handle(IPC.SETTINGS_SET_MANY, (_e, payload: unknown) =>
    setManySettings(setManySettingsInput.parse(payload))
  )

  handle(IPC.PROJECTS_LIST, () => listProjects())
  handle(IPC.PROJECTS_CREATE, (_e, payload: unknown) =>
    createProject(createProjectInput.parse(payload))
  )
  handle(IPC.PROJECTS_UPDATE, (_e, payload: unknown) =>
    updateProject(updateProjectInput.parse(payload))
  )
  handle(IPC.PROJECTS_ARCHIVE, (_e, id: string) => archiveProject(id))

  handle(IPC.SUPERINTENDENTS_LIST, () => listSuperintendents())
  handle(IPC.SUPERINTENDENTS_CREATE, (_e, payload: unknown) =>
    createSuperintendent(createSuperintendentInput.parse(payload))
  )
  handle(IPC.SUPERINTENDENTS_UPDATE, (_e, payload: unknown) =>
    updateSuperintendent(updateSuperintendentInput.parse(payload))
  )
  handle(IPC.SUPERINTENDENTS_ARCHIVE, (_e, id: string) => archiveSuperintendent(id))

  handle(IPC.PEOPLE_LIST, () => listPeople())
  handle(IPC.PEOPLE_CREATE, (_e, payload: unknown) =>
    createPerson(createPersonInput.parse(payload))
  )
  handle(IPC.PEOPLE_UPDATE, (_e, payload: unknown) =>
    updatePerson(updatePersonInput.parse(payload))
  )
  handle(IPC.PEOPLE_DELETE, (_e, id: string) => deletePerson(id))

  handle(IPC.CATEGORIES_LIST, () => listCategoriesWithItems())
  handle(IPC.CATEGORIES_UPDATE_WEIGHT, (_e, payload: unknown) =>
    updateCategoryWeight(updateCategoryWeightInput.parse(payload))
  )

  handle(IPC.CHECKLIST_ITEMS_CREATE, (_e, payload: unknown) =>
    createChecklistItem(createChecklistItemInput.parse(payload))
  )
  handle(IPC.CHECKLIST_ITEMS_UPDATE, (_e, payload: unknown) =>
    updateChecklistItem(updateChecklistItemInput.parse(payload))
  )
  handle(IPC.CHECKLIST_ITEMS_REORDER, (_e, payload: unknown) =>
    reorderChecklistItems(reorderChecklistItemsInput.parse(payload))
  )

  handle(IPC.WALKS_LIST_RECENT, () => listRecentWalks())
  handle(IPC.WALKS_GET, (_e, id: string) => getWalk(id))
  handle(IPC.WALKS_CREATE, (_e, payload: unknown) => createWalk(createWalkInput.parse(payload)))
  handle(IPC.WALKS_UPDATE_HEADER, (_e, payload: unknown) =>
    updateWalkHeader(updateWalkHeaderInput.parse(payload))
  )
  handle(IPC.WALKS_SET_ITEM_SCORE, (_e, payload: unknown) =>
    setItemScore(setItemScoreInput.parse(payload))
  )
  handle(IPC.WALKS_MARK_ALL_REMAINING_NA, (_e, payload: unknown) =>
    markAllRemainingNa(markAllRemainingNaInput.parse(payload))
  )
  handle(IPC.WALKS_SET_CATEGORY_NOTE, (_e, payload: unknown) =>
    setCategoryNote(setCategoryNoteInput.parse(payload))
  )
  handle(IPC.WALKS_COPY_FROM_LAST, (_e, payload: unknown) =>
    copyFromLastWalk(copyFromLastWalkInput.parse(payload))
  )
  handle(IPC.WALKS_GET_ITEM_HISTORY, (_e, payload: unknown) =>
    getItemHistory(getItemHistoryInput.parse(payload))
  )
  handle(IPC.WALKS_SUBMIT, (_e, payload: unknown) => submitWalk(submitWalkInput.parse(payload)))
  handle(IPC.WALKS_ARCHIVE, (_e, id: string) => archiveWalk(id))

  handle(IPC.ACTION_ITEMS_LIST_OPEN_FOR_SUPER_PROJECT, (_e, payload: unknown) =>
    listOpenActionItemsForSuperProject(listOpenActionItemsInput.parse(payload))
  )
  handle(IPC.ACTION_ITEMS_LIST_ALL, () => listAllActionItems())
  handle(IPC.ACTION_ITEMS_CREATE, (_e, payload: unknown) =>
    createActionItem(createActionItemInput.parse(payload))
  )
  handle(IPC.ACTION_ITEMS_UPDATE, (_e, payload: unknown) =>
    updateActionItem(updateActionItemInput.parse(payload))
  )
  handle(IPC.ACTION_ITEMS_TRANSITION, (_e, payload: unknown) =>
    transitionActionItem(transitionActionItemInput.parse(payload))
  )
  handle(IPC.ACTION_ITEMS_DELETE, (_e, id: string) => deleteActionItem(id))
  handle(IPC.ACTION_ITEMS_GET_EVENTS, (_e, payload: unknown) =>
    getActionItemEvents(getActionItemEventsInput.parse(payload))
  )

  handle(IPC.DASHBOARD_GET_MATRIX, (_e, payload: unknown) => getMatrix(getMatrixInput.parse(payload)))
  handle(IPC.DASHBOARD_GET_SUPER_WALK_HISTORY, (_e, superintendentId: string) =>
    getSuperintendentWalkHistory(superintendentId)
  )

  handle(IPC.REPORTS_GET_WEEK_NOTES, (_e, weekStart: string) => getWeekNotes(weekStart))
  handle(IPC.REPORTS_GET_FULL_DATA, (_e, payload: unknown) =>
    getFullReportData(getWeekReportInput.parse(payload).weekStart)
  )
  handle(IPC.REPORTS_GET_EXEC_DATA, (_e, payload: unknown) => {
    const input = getExecSummaryDataInput.parse(payload)
    return getExecSummaryData(input.weekStart, input.selectedNoteIds)
  })
  handle(IPC.REPORTS_EXPORT_FULL_PDF, (_e, payload: unknown) =>
    exportFullReportPdf(getWeekReportInput.parse(payload).weekStart)
  )
  handle(IPC.REPORTS_EXPORT_EXEC_PDF, (_e, payload: unknown) => {
    const input = exportExecSummaryPdfInput.parse(payload)
    return exportExecSummaryPdf(input.weekStart, input.selectedNoteIds)
  })
  handle(IPC.REPORTS_LIST_SNAPSHOTS, () => listReportSnapshots())
  handle(IPC.REPORTS_OPEN_SNAPSHOT_PDF, async (_e, id: string) => {
    const path = getSnapshotPdfPath(id)
    if (!path) return { success: false, error: 'No PDF path saved for this report.' }
    const error = await shell.openPath(path)
    return error ? { success: false, error } : { success: true, error: null }
  })

  handle(IPC.WALKS_EXPORT_PDF, (_e, payload: unknown) =>
    exportWalkPdf(exportWalkPdfInput.parse(payload).walkId)
  )

  handle(IPC.BACKUP_NOW, () => performBackup())
  handle(IPC.BACKUP_LIST, () => listBackups())
  handle(IPC.BACKUP_RESTORE, (_e, payload: unknown) =>
    restoreFromBackup(restoreBackupInput.parse(payload).fileName)
  )
  handle(IPC.BACKUP_EXPORT_JSON, () => exportJson())
  handle(IPC.BACKUP_IMPORT_JSON_PICK, () => importJsonPick())
  handle(IPC.BACKUP_IMPORT_JSON_COMMIT, (_e, payload: unknown) =>
    importJsonCommit(jsonImportCommitInput.parse(payload).filePath)
  )

  handle(IPC.LEGACY_IMPORT_PICK_AND_PREVIEW, () => legacyImportPickAndPreview())
  handle(IPC.LEGACY_IMPORT_COMMIT, (_e, payload: unknown) =>
    legacyImportCommit(legacyImportCommitInput.parse(payload).filePath)
  )

  handle(IPC.PROCORE_GET_WALK_PANEL_DATA, (_e, payload: unknown) =>
    getProcoreWalkPanelData(getProcoreWalkPanelDataInput.parse(payload))
  )
  handle(IPC.PROCORE_LIST_OPEN_OBSERVATIONS, (_e, payload: unknown) =>
    listProcoreOpenObservations(listProcoreOpenObservationsInput.parse(payload))
  )
  handle(IPC.PROCORE_IMPORT_OBSERVATIONS, (_e, payload: unknown) =>
    importProcoreObservations(importProcoreObservationsInput.parse(payload))
  )

  handle(IPC.LOGS_OPEN_FOLDER, async () => {
    const error = await shell.openPath(ensureLogsDir())
    return error ? { success: false, error } : { success: true, error: null }
  })

  handle(IPC.MCP_GET_CONNECTOR_INFO, async () => {
    // Points Claude Desktop's config at THIS running app's own executable,
    // in ELECTRON_RUN_AS_NODE mode, instead of a plain `node` + scripts/
    // run-mcp.js wrapper - works for a packaged install too (no Node.js
    // needs to be installed on the user's machine, since we spawn our own
    // binary, not a system one), and works identically in dev
    // (process.execPath is node_modules/electron's binary) and packaged
    // (process.execPath is Renvor.exe itself).
    const mcpEntryPath = app.isPackaged
      ? join(process.resourcesPath, 'app.asar', 'out', 'main', 'mcp.js')
      : join(projectRoot, 'out', 'main', 'mcp.js')
    // Same asar-vs-extraResources split as index.ts's own runMigrations call
    // - passed through so the spawned process (which has no `app` module to
    // ask, per mcp/server.ts's comment) doesn't have to guess it.
    const drizzleDir = app.isPackaged ? join(process.resourcesPath, 'drizzle') : join(projectRoot, 'drizzle')
    const stdioCommand = process.execPath
    const stdioArgs = [mcpEntryPath]
    const stdioEnv = { ELECTRON_RUN_AS_NODE: '1', RENVOR_DRIZZLE_DIR: drizzleDir }
    const stdioConfigSnippet = JSON.stringify(
      { mcpServers: { renvor: { command: stdioCommand, args: stdioArgs, env: stdioEnv } } },
      null,
      2
    )
    const httpStatus = getMcpHttpStatus()
    const certTrusted = httpStatus.running ? await isCertTrusted() : false
    return {
      url: getMcpHttpUrl(),
      httpServerRunning: httpStatus.running,
      httpServerError: httpStatus.error,
      certTrusted,
      stdioCommand,
      stdioArgs,
      stdioConfigSnippet
    }
  })

  handle(IPC.MCP_OPEN_CERT_FILE, async () => {
    const error = await shell.openPath(getMcpCertFilePath())
    return error ? { success: false, error } : { success: true, error: null }
  })

  handle(IPC.MCP_OPEN_CLAUDE_CONFIG_FOLDER, async () => {
    // %APPDATA%\Claude - Claude Desktop's own well-known config folder
    // (holds claude_desktop_config.json). Opens the folder rather than the
    // file directly: a fresh Claude Desktop install may not have created
    // the file yet, and openPath on a nonexistent file just fails, whereas
    // the folder itself exists once Claude Desktop has run at least once.
    const error = await shell.openPath(join(app.getPath('appData'), 'Claude'))
    return error ? { success: false, error } : { success: true, error: null }
  })

  handle(IPC.PHONE_GET_INFO, () => getPhoneInfo())
  handle(IPC.PHONE_SET_ENABLED, (_e, enabled: boolean) => setPhoneAccess(Boolean(enabled)))
  handle(IPC.PHONE_RESET_LINK, () => resetPhoneLink())
  handle(IPC.PHONE_SET_AUTOSTART, (_e, enabled: boolean) => setPhoneAutostart(Boolean(enabled)))

  handle(IPC.UPDATE_GET_STATUS, () => getUpdateStatus())
  handle(IPC.UPDATE_CHECK, () => checkForUpdates(false))
  handle(IPC.UPDATE_DOWNLOAD, () => downloadUpdate())
  handle(IPC.UPDATE_INSTALL, () => installUpdate())

  handle(IPC.CUSTOMIZE_GET_INFO, () => getCustomizeInfo())
  handle(IPC.CUSTOMIZE_OPEN_SOURCE, () => openCustomizeSource())
}
