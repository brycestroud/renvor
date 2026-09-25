import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC,
  type SetManySettingsInput,
  type CreateProjectInput,
  type UpdateProjectInput,
  type CreateSuperintendentInput,
  type UpdateSuperintendentInput,
  type CreatePersonInput,
  type UpdatePersonInput,
  type UpdateCategoryWeightInput,
  type CreateChecklistItemInput,
  type UpdateChecklistItemInput,
  type ReorderChecklistItemsInput,
  type CreateWalkInput,
  type UpdateWalkHeaderInput,
  type SetItemScoreInput,
  type MarkAllRemainingNaInput,
  type SetCategoryNoteInput,
  type CopyFromLastWalkInput,
  type GetItemHistoryInput,
  type SubmitWalkInput,
  type ListOpenActionItemsInput,
  type CreateActionItemInput,
  type UpdateActionItemInput,
  type TransitionActionItemInput,
  type GetActionItemEventsInput,
  type GetMatrixInput,
  type GetExecSummaryDataInput,
  type ExportExecSummaryPdfInput,
  type ExportWalkPdfInput
} from '@shared/ipc-contract'

const api = {
  getAppVersion: () => ipcRenderer.invoke(IPC.APP_GET_VERSION),
  getSettings: () => ipcRenderer.invoke(IPC.SETTINGS_GET_ALL),
  setSettings: (input: SetManySettingsInput) => ipcRenderer.invoke(IPC.SETTINGS_SET_MANY, input),

  listProjects: () => ipcRenderer.invoke(IPC.PROJECTS_LIST),
  createProject: (input: CreateProjectInput) => ipcRenderer.invoke(IPC.PROJECTS_CREATE, input),
  updateProject: (input: UpdateProjectInput) => ipcRenderer.invoke(IPC.PROJECTS_UPDATE, input),
  archiveProject: (id: string) => ipcRenderer.invoke(IPC.PROJECTS_ARCHIVE, id),

  listSuperintendents: () => ipcRenderer.invoke(IPC.SUPERINTENDENTS_LIST),
  createSuperintendent: (input: CreateSuperintendentInput) =>
    ipcRenderer.invoke(IPC.SUPERINTENDENTS_CREATE, input),
  updateSuperintendent: (input: UpdateSuperintendentInput) =>
    ipcRenderer.invoke(IPC.SUPERINTENDENTS_UPDATE, input),
  archiveSuperintendent: (id: string) => ipcRenderer.invoke(IPC.SUPERINTENDENTS_ARCHIVE, id),

  listPeople: () => ipcRenderer.invoke(IPC.PEOPLE_LIST),
  createPerson: (input: CreatePersonInput) => ipcRenderer.invoke(IPC.PEOPLE_CREATE, input),
  updatePerson: (input: UpdatePersonInput) => ipcRenderer.invoke(IPC.PEOPLE_UPDATE, input),
  deletePerson: (id: string) => ipcRenderer.invoke(IPC.PEOPLE_DELETE, id),

  listCategories: () => ipcRenderer.invoke(IPC.CATEGORIES_LIST),
  updateCategoryWeight: (input: UpdateCategoryWeightInput) =>
    ipcRenderer.invoke(IPC.CATEGORIES_UPDATE_WEIGHT, input),

  createChecklistItem: (input: CreateChecklistItemInput) =>
    ipcRenderer.invoke(IPC.CHECKLIST_ITEMS_CREATE, input),
  updateChecklistItem: (input: UpdateChecklistItemInput) =>
    ipcRenderer.invoke(IPC.CHECKLIST_ITEMS_UPDATE, input),
  reorderChecklistItems: (input: ReorderChecklistItemsInput) =>
    ipcRenderer.invoke(IPC.CHECKLIST_ITEMS_REORDER, input),

  listRecentWalks: () => ipcRenderer.invoke(IPC.WALKS_LIST_RECENT),
  getWalk: (id: string) => ipcRenderer.invoke(IPC.WALKS_GET, id),
  createWalk: (input: CreateWalkInput) => ipcRenderer.invoke(IPC.WALKS_CREATE, input),
  updateWalkHeader: (input: UpdateWalkHeaderInput) =>
    ipcRenderer.invoke(IPC.WALKS_UPDATE_HEADER, input),
  setItemScore: (input: SetItemScoreInput) => ipcRenderer.invoke(IPC.WALKS_SET_ITEM_SCORE, input),
  markAllRemainingNa: (input: MarkAllRemainingNaInput) =>
    ipcRenderer.invoke(IPC.WALKS_MARK_ALL_REMAINING_NA, input),
  setCategoryNote: (input: SetCategoryNoteInput) =>
    ipcRenderer.invoke(IPC.WALKS_SET_CATEGORY_NOTE, input),
  copyFromLastWalk: (input: CopyFromLastWalkInput) =>
    ipcRenderer.invoke(IPC.WALKS_COPY_FROM_LAST, input),
  getItemHistory: (input: GetItemHistoryInput) =>
    ipcRenderer.invoke(IPC.WALKS_GET_ITEM_HISTORY, input),
  submitWalk: (input: SubmitWalkInput) => ipcRenderer.invoke(IPC.WALKS_SUBMIT, input),
  archiveWalk: (id: string) => ipcRenderer.invoke(IPC.WALKS_ARCHIVE, id),

  listOpenActionItems: (input: ListOpenActionItemsInput) =>
    ipcRenderer.invoke(IPC.ACTION_ITEMS_LIST_OPEN_FOR_SUPER_PROJECT, input),
  listAllActionItems: () => ipcRenderer.invoke(IPC.ACTION_ITEMS_LIST_ALL),
  createActionItem: (input: CreateActionItemInput) =>
    ipcRenderer.invoke(IPC.ACTION_ITEMS_CREATE, input),
  updateActionItem: (input: UpdateActionItemInput) =>
    ipcRenderer.invoke(IPC.ACTION_ITEMS_UPDATE, input),
  transitionActionItem: (input: TransitionActionItemInput) =>
    ipcRenderer.invoke(IPC.ACTION_ITEMS_TRANSITION, input),
  deleteActionItem: (id: string) => ipcRenderer.invoke(IPC.ACTION_ITEMS_DELETE, id),
  getActionItemEvents: (input: GetActionItemEventsInput) =>
    ipcRenderer.invoke(IPC.ACTION_ITEMS_GET_EVENTS, input),

  getDashboardMatrix: (input: GetMatrixInput) => ipcRenderer.invoke(IPC.DASHBOARD_GET_MATRIX, input),
  getSuperintendentWalkHistory: (superintendentId: string) =>
    ipcRenderer.invoke(IPC.DASHBOARD_GET_SUPER_WALK_HISTORY, superintendentId),

  getWeekNotes: (weekStart: string) => ipcRenderer.invoke(IPC.REPORTS_GET_WEEK_NOTES, weekStart),
  getFullReportData: (weekStart: string) => ipcRenderer.invoke(IPC.REPORTS_GET_FULL_DATA, { weekStart }),
  getExecSummaryData: (input: GetExecSummaryDataInput) =>
    ipcRenderer.invoke(IPC.REPORTS_GET_EXEC_DATA, input),
  exportFullReportPdf: (weekStart: string) =>
    ipcRenderer.invoke(IPC.REPORTS_EXPORT_FULL_PDF, { weekStart }),
  exportExecSummaryPdf: (input: ExportExecSummaryPdfInput) =>
    ipcRenderer.invoke(IPC.REPORTS_EXPORT_EXEC_PDF, input),
  listReportSnapshots: () => ipcRenderer.invoke(IPC.REPORTS_LIST_SNAPSHOTS),
  openSnapshotPdf: (id: string) => ipcRenderer.invoke(IPC.REPORTS_OPEN_SNAPSHOT_PDF, id),

  exportWalkPdf: (input: ExportWalkPdfInput) => ipcRenderer.invoke(IPC.WALKS_EXPORT_PDF, input),

  notifyPrintReady: () => ipcRenderer.send(IPC.PRINT_MARK_READY)
}

export type GsApi = typeof api

contextBridge.exposeInMainWorld('gsApi', api)
