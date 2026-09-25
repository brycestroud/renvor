import type {
  AppSettings,
  SetManySettingsInput,
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  Superintendent,
  CreateSuperintendentInput,
  UpdateSuperintendentInput,
  Person,
  CreatePersonInput,
  UpdatePersonInput,
  CategoryWithItems,
  UpdateCategoryWeightInput,
  CreateChecklistItemInput,
  UpdateChecklistItemInput,
  ReorderChecklistItemsInput,
  WalkListItem,
  WalkDetail,
  CreateWalkInput,
  UpdateWalkHeaderInput,
  SetItemScoreInput,
  MarkAllRemainingNaInput,
  SetCategoryNoteInput,
  CopyFromLastWalkInput,
  GetItemHistoryInput,
  ItemHistoryRecord,
  SubmitWalkInput,
  ActionItemDto,
  ActionItemListDto,
  ActionItemEventDto,
  ListOpenActionItemsInput,
  CreateActionItemInput,
  UpdateActionItemInput,
  TransitionActionItemInput,
  GetActionItemEventsInput,
  DashboardMatrix,
  GetMatrixInput,
  WalkHistoryEntry,
  WeekNote,
  FullReportData,
  ExecSummaryData,
  GetExecSummaryDataInput,
  ExportExecSummaryPdfInput,
  ExportWalkPdfInput,
  PdfExportResult,
  ReportSnapshotDto,
  OpenSnapshotResult,
  BackupFileInfo,
  RestoreBackupInput,
  RestoreResult,
  JsonImportPickResult,
  JsonImportCommitInput,
  JsonImportCommitResult,
  LegacyImportPickResult,
  LegacyImportCommitInput,
  LegacyImportCommitResult,
  GetProcoreWalkPanelDataInput,
  ProcoreWalkPanelData,
  ListProcoreOpenObservationsInput,
  ProcoreObservationDto,
  ImportProcoreObservationsInput,
  OpenLogsFolderResult
} from '@shared/ipc-contract'

export interface GsApi {
  getAppVersion: () => Promise<string>
  getSettings: () => Promise<AppSettings>
  setSettings: (input: SetManySettingsInput) => Promise<AppSettings>

  listProjects: () => Promise<Project[]>
  createProject: (input: CreateProjectInput) => Promise<Project>
  updateProject: (input: UpdateProjectInput) => Promise<Project>
  archiveProject: (id: string) => Promise<void>

  listSuperintendents: () => Promise<Superintendent[]>
  createSuperintendent: (input: CreateSuperintendentInput) => Promise<Superintendent>
  updateSuperintendent: (input: UpdateSuperintendentInput) => Promise<Superintendent>
  archiveSuperintendent: (id: string) => Promise<void>

  listPeople: () => Promise<Person[]>
  createPerson: (input: CreatePersonInput) => Promise<Person>
  updatePerson: (input: UpdatePersonInput) => Promise<Person>
  deletePerson: (id: string) => Promise<void>

  listCategories: () => Promise<CategoryWithItems[]>
  updateCategoryWeight: (input: UpdateCategoryWeightInput) => Promise<void>

  createChecklistItem: (input: CreateChecklistItemInput) => Promise<void>
  updateChecklistItem: (input: UpdateChecklistItemInput) => Promise<void>
  reorderChecklistItems: (input: ReorderChecklistItemsInput) => Promise<void>

  listRecentWalks: () => Promise<WalkListItem[]>
  getWalk: (id: string) => Promise<WalkDetail>
  createWalk: (input: CreateWalkInput) => Promise<WalkDetail>
  updateWalkHeader: (input: UpdateWalkHeaderInput) => Promise<WalkDetail>
  setItemScore: (input: SetItemScoreInput) => Promise<void>
  markAllRemainingNa: (input: MarkAllRemainingNaInput) => Promise<void>
  setCategoryNote: (input: SetCategoryNoteInput) => Promise<void>
  copyFromLastWalk: (input: CopyFromLastWalkInput) => Promise<WalkDetail>
  getItemHistory: (input: GetItemHistoryInput) => Promise<ItemHistoryRecord[]>
  submitWalk: (input: SubmitWalkInput) => Promise<WalkDetail>
  archiveWalk: (id: string) => Promise<void>

  listOpenActionItems: (input: ListOpenActionItemsInput) => Promise<ActionItemDto[]>
  listAllActionItems: () => Promise<ActionItemListDto[]>
  createActionItem: (input: CreateActionItemInput) => Promise<ActionItemDto>
  updateActionItem: (input: UpdateActionItemInput) => Promise<ActionItemDto>
  transitionActionItem: (input: TransitionActionItemInput) => Promise<ActionItemDto>
  deleteActionItem: (id: string) => Promise<void>
  getActionItemEvents: (input: GetActionItemEventsInput) => Promise<ActionItemEventDto[]>

  getDashboardMatrix: (input: GetMatrixInput) => Promise<DashboardMatrix>
  getSuperintendentWalkHistory: (superintendentId: string) => Promise<WalkHistoryEntry[]>

  getWeekNotes: (weekStart: string) => Promise<WeekNote[]>
  getFullReportData: (weekStart: string) => Promise<FullReportData>
  getExecSummaryData: (input: GetExecSummaryDataInput) => Promise<ExecSummaryData>
  exportFullReportPdf: (weekStart: string) => Promise<PdfExportResult>
  exportExecSummaryPdf: (input: ExportExecSummaryPdfInput) => Promise<PdfExportResult>
  listReportSnapshots: () => Promise<ReportSnapshotDto[]>
  openSnapshotPdf: (id: string) => Promise<OpenSnapshotResult>

  exportWalkPdf: (input: ExportWalkPdfInput) => Promise<PdfExportResult>

  notifyPrintReady: () => void

  backupNow: () => Promise<BackupFileInfo>
  listBackups: () => Promise<BackupFileInfo[]>
  restoreBackup: (input: RestoreBackupInput) => Promise<RestoreResult>
  exportDataJson: () => Promise<PdfExportResult>
  importDataJsonPick: () => Promise<JsonImportPickResult>
  importDataJsonCommit: (input: JsonImportCommitInput) => Promise<JsonImportCommitResult>

  legacyImportPickAndPreview: () => Promise<LegacyImportPickResult>
  legacyImportCommit: (input: LegacyImportCommitInput) => Promise<LegacyImportCommitResult>

  getProcoreWalkPanelData: (input: GetProcoreWalkPanelDataInput) => Promise<ProcoreWalkPanelData>
  listProcoreOpenObservations: (input: ListProcoreOpenObservationsInput) => Promise<ProcoreObservationDto[]>
  importProcoreObservations: (input: ImportProcoreObservationsInput) => Promise<ActionItemDto[]>

  openLogsFolder: () => Promise<OpenLogsFolderResult>
}

declare global {
  interface Window {
    gsApi: GsApi
  }
}

export const gsApi = (): GsApi => window.gsApi
