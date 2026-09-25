import { ipcMain, app, shell } from 'electron'
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

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.APP_GET_VERSION, () => app.getVersion())

  ipcMain.handle(IPC.SETTINGS_GET_ALL, () => getAllSettings())
  ipcMain.handle(IPC.SETTINGS_SET_MANY, (_e, payload: unknown) =>
    setManySettings(setManySettingsInput.parse(payload))
  )

  ipcMain.handle(IPC.PROJECTS_LIST, () => listProjects())
  ipcMain.handle(IPC.PROJECTS_CREATE, (_e, payload: unknown) =>
    createProject(createProjectInput.parse(payload))
  )
  ipcMain.handle(IPC.PROJECTS_UPDATE, (_e, payload: unknown) =>
    updateProject(updateProjectInput.parse(payload))
  )
  ipcMain.handle(IPC.PROJECTS_ARCHIVE, (_e, id: string) => archiveProject(id))

  ipcMain.handle(IPC.SUPERINTENDENTS_LIST, () => listSuperintendents())
  ipcMain.handle(IPC.SUPERINTENDENTS_CREATE, (_e, payload: unknown) =>
    createSuperintendent(createSuperintendentInput.parse(payload))
  )
  ipcMain.handle(IPC.SUPERINTENDENTS_UPDATE, (_e, payload: unknown) =>
    updateSuperintendent(updateSuperintendentInput.parse(payload))
  )
  ipcMain.handle(IPC.SUPERINTENDENTS_ARCHIVE, (_e, id: string) => archiveSuperintendent(id))

  ipcMain.handle(IPC.PEOPLE_LIST, () => listPeople())
  ipcMain.handle(IPC.PEOPLE_CREATE, (_e, payload: unknown) =>
    createPerson(createPersonInput.parse(payload))
  )
  ipcMain.handle(IPC.PEOPLE_UPDATE, (_e, payload: unknown) =>
    updatePerson(updatePersonInput.parse(payload))
  )
  ipcMain.handle(IPC.PEOPLE_DELETE, (_e, id: string) => deletePerson(id))

  ipcMain.handle(IPC.CATEGORIES_LIST, () => listCategoriesWithItems())
  ipcMain.handle(IPC.CATEGORIES_UPDATE_WEIGHT, (_e, payload: unknown) =>
    updateCategoryWeight(updateCategoryWeightInput.parse(payload))
  )

  ipcMain.handle(IPC.CHECKLIST_ITEMS_CREATE, (_e, payload: unknown) =>
    createChecklistItem(createChecklistItemInput.parse(payload))
  )
  ipcMain.handle(IPC.CHECKLIST_ITEMS_UPDATE, (_e, payload: unknown) =>
    updateChecklistItem(updateChecklistItemInput.parse(payload))
  )
  ipcMain.handle(IPC.CHECKLIST_ITEMS_REORDER, (_e, payload: unknown) =>
    reorderChecklistItems(reorderChecklistItemsInput.parse(payload))
  )

  ipcMain.handle(IPC.WALKS_LIST_RECENT, () => listRecentWalks())
  ipcMain.handle(IPC.WALKS_GET, (_e, id: string) => getWalk(id))
  ipcMain.handle(IPC.WALKS_CREATE, (_e, payload: unknown) => createWalk(createWalkInput.parse(payload)))
  ipcMain.handle(IPC.WALKS_UPDATE_HEADER, (_e, payload: unknown) =>
    updateWalkHeader(updateWalkHeaderInput.parse(payload))
  )
  ipcMain.handle(IPC.WALKS_SET_ITEM_SCORE, (_e, payload: unknown) =>
    setItemScore(setItemScoreInput.parse(payload))
  )
  ipcMain.handle(IPC.WALKS_MARK_ALL_REMAINING_NA, (_e, payload: unknown) =>
    markAllRemainingNa(markAllRemainingNaInput.parse(payload))
  )
  ipcMain.handle(IPC.WALKS_SET_CATEGORY_NOTE, (_e, payload: unknown) =>
    setCategoryNote(setCategoryNoteInput.parse(payload))
  )
  ipcMain.handle(IPC.WALKS_COPY_FROM_LAST, (_e, payload: unknown) =>
    copyFromLastWalk(copyFromLastWalkInput.parse(payload))
  )
  ipcMain.handle(IPC.WALKS_GET_ITEM_HISTORY, (_e, payload: unknown) =>
    getItemHistory(getItemHistoryInput.parse(payload))
  )
  ipcMain.handle(IPC.WALKS_SUBMIT, (_e, payload: unknown) => submitWalk(submitWalkInput.parse(payload)))
  ipcMain.handle(IPC.WALKS_ARCHIVE, (_e, id: string) => archiveWalk(id))

  ipcMain.handle(IPC.ACTION_ITEMS_LIST_OPEN_FOR_SUPER_PROJECT, (_e, payload: unknown) =>
    listOpenActionItemsForSuperProject(listOpenActionItemsInput.parse(payload))
  )
  ipcMain.handle(IPC.ACTION_ITEMS_LIST_ALL, () => listAllActionItems())
  ipcMain.handle(IPC.ACTION_ITEMS_CREATE, (_e, payload: unknown) =>
    createActionItem(createActionItemInput.parse(payload))
  )
  ipcMain.handle(IPC.ACTION_ITEMS_UPDATE, (_e, payload: unknown) =>
    updateActionItem(updateActionItemInput.parse(payload))
  )
  ipcMain.handle(IPC.ACTION_ITEMS_TRANSITION, (_e, payload: unknown) =>
    transitionActionItem(transitionActionItemInput.parse(payload))
  )
  ipcMain.handle(IPC.ACTION_ITEMS_DELETE, (_e, id: string) => deleteActionItem(id))
  ipcMain.handle(IPC.ACTION_ITEMS_GET_EVENTS, (_e, payload: unknown) =>
    getActionItemEvents(getActionItemEventsInput.parse(payload))
  )

  ipcMain.handle(IPC.DASHBOARD_GET_MATRIX, (_e, payload: unknown) => getMatrix(getMatrixInput.parse(payload)))
  ipcMain.handle(IPC.DASHBOARD_GET_SUPER_WALK_HISTORY, (_e, superintendentId: string) =>
    getSuperintendentWalkHistory(superintendentId)
  )

  ipcMain.handle(IPC.REPORTS_GET_WEEK_NOTES, (_e, weekStart: string) => getWeekNotes(weekStart))
  ipcMain.handle(IPC.REPORTS_GET_FULL_DATA, (_e, payload: unknown) =>
    getFullReportData(getWeekReportInput.parse(payload).weekStart)
  )
  ipcMain.handle(IPC.REPORTS_GET_EXEC_DATA, (_e, payload: unknown) => {
    const input = getExecSummaryDataInput.parse(payload)
    return getExecSummaryData(input.weekStart, input.selectedNoteIds)
  })
  ipcMain.handle(IPC.REPORTS_EXPORT_FULL_PDF, (_e, payload: unknown) =>
    exportFullReportPdf(getWeekReportInput.parse(payload).weekStart)
  )
  ipcMain.handle(IPC.REPORTS_EXPORT_EXEC_PDF, (_e, payload: unknown) => {
    const input = exportExecSummaryPdfInput.parse(payload)
    return exportExecSummaryPdf(input.weekStart, input.selectedNoteIds)
  })
  ipcMain.handle(IPC.REPORTS_LIST_SNAPSHOTS, () => listReportSnapshots())
  ipcMain.handle(IPC.REPORTS_OPEN_SNAPSHOT_PDF, async (_e, id: string) => {
    const path = getSnapshotPdfPath(id)
    if (!path) return { success: false, error: 'No PDF path saved for this report.' }
    const error = await shell.openPath(path)
    return error ? { success: false, error } : { success: true, error: null }
  })

  ipcMain.handle(IPC.WALKS_EXPORT_PDF, (_e, payload: unknown) =>
    exportWalkPdf(exportWalkPdfInput.parse(payload).walkId)
  )

  ipcMain.handle(IPC.BACKUP_NOW, () => performBackup())
  ipcMain.handle(IPC.BACKUP_LIST, () => listBackups())
  ipcMain.handle(IPC.BACKUP_RESTORE, (_e, payload: unknown) =>
    restoreFromBackup(restoreBackupInput.parse(payload).fileName)
  )
  ipcMain.handle(IPC.BACKUP_EXPORT_JSON, () => exportJson())
  ipcMain.handle(IPC.BACKUP_IMPORT_JSON_PICK, () => importJsonPick())
  ipcMain.handle(IPC.BACKUP_IMPORT_JSON_COMMIT, (_e, payload: unknown) =>
    importJsonCommit(jsonImportCommitInput.parse(payload).filePath)
  )

  ipcMain.handle(IPC.LEGACY_IMPORT_PICK_AND_PREVIEW, () => legacyImportPickAndPreview())
  ipcMain.handle(IPC.LEGACY_IMPORT_COMMIT, (_e, payload: unknown) =>
    legacyImportCommit(legacyImportCommitInput.parse(payload).filePath)
  )

  ipcMain.handle(IPC.PROCORE_GET_WALK_PANEL_DATA, (_e, payload: unknown) =>
    getProcoreWalkPanelData(getProcoreWalkPanelDataInput.parse(payload))
  )
  ipcMain.handle(IPC.PROCORE_LIST_OPEN_OBSERVATIONS, (_e, payload: unknown) =>
    listProcoreOpenObservations(listProcoreOpenObservationsInput.parse(payload))
  )
  ipcMain.handle(IPC.PROCORE_IMPORT_OBSERVATIONS, (_e, payload: unknown) =>
    importProcoreObservations(importProcoreObservationsInput.parse(payload))
  )

  ipcMain.handle(IPC.LOGS_OPEN_FOLDER, async () => {
    const error = await shell.openPath(ensureLogsDir())
    return error ? { success: false, error } : { success: true, error: null }
  })
}
