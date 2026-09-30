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
  type ExportWalkPdfInput,
  type RestoreBackupInput,
  type JsonImportCommitInput,
  type LegacyImportCommitInput,
  type GetProcoreWalkPanelDataInput,
  type ListProcoreOpenObservationsInput,
  type ImportProcoreObservationsInput,
  type PhoneAccessInfo,
  type CustomizeInfo,
  type UpdateStatus,
  type OpenSourceResult
} from '@shared/ipc-contract'


/**
 * The one place method names map to IPC channels + argument shaping. The
 * Electron preload wires it to ipcRenderer; the phone/browser build wires it
 * to an HTTP POST (lib/gsApi.ts) so both call the exact same handlers.
 */
export function createApi(
  invoke: (channel: string, payload?: unknown) => Promise<any>,
  send: (channel: string) => void
) {
  return {
  getAppVersion: () => invoke(IPC.APP_GET_VERSION),
  getSettings: () => invoke(IPC.SETTINGS_GET_ALL),
  setSettings: (input: SetManySettingsInput) => invoke(IPC.SETTINGS_SET_MANY, input),

  listProjects: () => invoke(IPC.PROJECTS_LIST),
  createProject: (input: CreateProjectInput) => invoke(IPC.PROJECTS_CREATE, input),
  updateProject: (input: UpdateProjectInput) => invoke(IPC.PROJECTS_UPDATE, input),
  archiveProject: (id: string) => invoke(IPC.PROJECTS_ARCHIVE, id),

  listSuperintendents: () => invoke(IPC.SUPERINTENDENTS_LIST),
  createSuperintendent: (input: CreateSuperintendentInput) =>
    invoke(IPC.SUPERINTENDENTS_CREATE, input),
  updateSuperintendent: (input: UpdateSuperintendentInput) =>
    invoke(IPC.SUPERINTENDENTS_UPDATE, input),
  archiveSuperintendent: (id: string) => invoke(IPC.SUPERINTENDENTS_ARCHIVE, id),

  listPeople: () => invoke(IPC.PEOPLE_LIST),
  createPerson: (input: CreatePersonInput) => invoke(IPC.PEOPLE_CREATE, input),
  updatePerson: (input: UpdatePersonInput) => invoke(IPC.PEOPLE_UPDATE, input),
  deletePerson: (id: string) => invoke(IPC.PEOPLE_DELETE, id),

  listCategories: () => invoke(IPC.CATEGORIES_LIST),
  updateCategoryWeight: (input: UpdateCategoryWeightInput) =>
    invoke(IPC.CATEGORIES_UPDATE_WEIGHT, input),

  createChecklistItem: (input: CreateChecklistItemInput) =>
    invoke(IPC.CHECKLIST_ITEMS_CREATE, input),
  updateChecklistItem: (input: UpdateChecklistItemInput) =>
    invoke(IPC.CHECKLIST_ITEMS_UPDATE, input),
  reorderChecklistItems: (input: ReorderChecklistItemsInput) =>
    invoke(IPC.CHECKLIST_ITEMS_REORDER, input),

  listRecentWalks: () => invoke(IPC.WALKS_LIST_RECENT),
  getWalk: (id: string) => invoke(IPC.WALKS_GET, id),
  createWalk: (input: CreateWalkInput) => invoke(IPC.WALKS_CREATE, input),
  updateWalkHeader: (input: UpdateWalkHeaderInput) =>
    invoke(IPC.WALKS_UPDATE_HEADER, input),
  setItemScore: (input: SetItemScoreInput) => invoke(IPC.WALKS_SET_ITEM_SCORE, input),
  markAllRemainingNa: (input: MarkAllRemainingNaInput) =>
    invoke(IPC.WALKS_MARK_ALL_REMAINING_NA, input),
  setCategoryNote: (input: SetCategoryNoteInput) =>
    invoke(IPC.WALKS_SET_CATEGORY_NOTE, input),
  copyFromLastWalk: (input: CopyFromLastWalkInput) =>
    invoke(IPC.WALKS_COPY_FROM_LAST, input),
  getItemHistory: (input: GetItemHistoryInput) =>
    invoke(IPC.WALKS_GET_ITEM_HISTORY, input),
  submitWalk: (input: SubmitWalkInput) => invoke(IPC.WALKS_SUBMIT, input),
  archiveWalk: (id: string) => invoke(IPC.WALKS_ARCHIVE, id),

  listOpenActionItems: (input: ListOpenActionItemsInput) =>
    invoke(IPC.ACTION_ITEMS_LIST_OPEN_FOR_SUPER_PROJECT, input),
  listAllActionItems: () => invoke(IPC.ACTION_ITEMS_LIST_ALL),
  createActionItem: (input: CreateActionItemInput) =>
    invoke(IPC.ACTION_ITEMS_CREATE, input),
  updateActionItem: (input: UpdateActionItemInput) =>
    invoke(IPC.ACTION_ITEMS_UPDATE, input),
  transitionActionItem: (input: TransitionActionItemInput) =>
    invoke(IPC.ACTION_ITEMS_TRANSITION, input),
  deleteActionItem: (id: string) => invoke(IPC.ACTION_ITEMS_DELETE, id),
  getActionItemEvents: (input: GetActionItemEventsInput) =>
    invoke(IPC.ACTION_ITEMS_GET_EVENTS, input),

  getDashboardMatrix: (input: GetMatrixInput) => invoke(IPC.DASHBOARD_GET_MATRIX, input),
  getSuperintendentWalkHistory: (superintendentId: string) =>
    invoke(IPC.DASHBOARD_GET_SUPER_WALK_HISTORY, superintendentId),

  getWeekNotes: (weekStart: string) => invoke(IPC.REPORTS_GET_WEEK_NOTES, weekStart),
  getFullReportData: (weekStart: string) => invoke(IPC.REPORTS_GET_FULL_DATA, { weekStart }),
  getExecSummaryData: (input: GetExecSummaryDataInput) =>
    invoke(IPC.REPORTS_GET_EXEC_DATA, input),
  exportFullReportPdf: (weekStart: string) =>
    invoke(IPC.REPORTS_EXPORT_FULL_PDF, { weekStart }),
  exportExecSummaryPdf: (input: ExportExecSummaryPdfInput) =>
    invoke(IPC.REPORTS_EXPORT_EXEC_PDF, input),
  listReportSnapshots: () => invoke(IPC.REPORTS_LIST_SNAPSHOTS),
  openSnapshotPdf: (id: string) => invoke(IPC.REPORTS_OPEN_SNAPSHOT_PDF, id),

  exportWalkPdf: (input: ExportWalkPdfInput) => invoke(IPC.WALKS_EXPORT_PDF, input),

  notifyPrintReady: () => send(IPC.PRINT_MARK_READY),

  backupNow: () => invoke(IPC.BACKUP_NOW),
  listBackups: () => invoke(IPC.BACKUP_LIST),
  restoreBackup: (input: RestoreBackupInput) => invoke(IPC.BACKUP_RESTORE, input),
  exportDataJson: () => invoke(IPC.BACKUP_EXPORT_JSON),
  importDataJsonPick: () => invoke(IPC.BACKUP_IMPORT_JSON_PICK),
  importDataJsonCommit: (input: JsonImportCommitInput) =>
    invoke(IPC.BACKUP_IMPORT_JSON_COMMIT, input),

  legacyImportPickAndPreview: () => invoke(IPC.LEGACY_IMPORT_PICK_AND_PREVIEW),
  legacyImportCommit: (input: LegacyImportCommitInput) =>
    invoke(IPC.LEGACY_IMPORT_COMMIT, input),

  getProcoreWalkPanelData: (input: GetProcoreWalkPanelDataInput) =>
    invoke(IPC.PROCORE_GET_WALK_PANEL_DATA, input),
  listProcoreOpenObservations: (input: ListProcoreOpenObservationsInput) =>
    invoke(IPC.PROCORE_LIST_OPEN_OBSERVATIONS, input),
  importProcoreObservations: (input: ImportProcoreObservationsInput) =>
    invoke(IPC.PROCORE_IMPORT_OBSERVATIONS, input),

  openLogsFolder: () => invoke(IPC.LOGS_OPEN_FOLDER),

  getMcpConnectorInfo: () => invoke(IPC.MCP_GET_CONNECTOR_INFO),
  openMcpCertFile: () => invoke(IPC.MCP_OPEN_CERT_FILE),
  openClaudeConfigFolder: () => invoke(IPC.MCP_OPEN_CLAUDE_CONFIG_FOLDER),

  getPhoneInfo: (): Promise<PhoneAccessInfo> => invoke(IPC.PHONE_GET_INFO),
  setPhoneEnabled: (enabled: boolean): Promise<PhoneAccessInfo> => invoke(IPC.PHONE_SET_ENABLED, enabled),
  resetPhoneLink: (): Promise<PhoneAccessInfo> => invoke(IPC.PHONE_RESET_LINK),
  setPhoneAutostart: (enabled: boolean): Promise<PhoneAccessInfo> =>
    invoke(IPC.PHONE_SET_AUTOSTART, enabled),

  getUpdateStatus: (): Promise<UpdateStatus> => invoke(IPC.UPDATE_GET_STATUS),
  checkForUpdates: (): Promise<UpdateStatus> => invoke(IPC.UPDATE_CHECK),
  downloadUpdate: (): Promise<UpdateStatus> => invoke(IPC.UPDATE_DOWNLOAD),
  installUpdate: (): Promise<UpdateStatus> => invoke(IPC.UPDATE_INSTALL),

  getCustomizeInfo: (): Promise<CustomizeInfo> => invoke(IPC.CUSTOMIZE_GET_INFO),
  openCustomizeSource: (): Promise<OpenSourceResult> => invoke(IPC.CUSTOMIZE_OPEN_SOURCE)
}
}
