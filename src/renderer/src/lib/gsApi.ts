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
  OpenLogsFolderResult,
  McpConnectorInfo,
  OpenCertFileResult,
  OpenClaudeConfigFolderResult,
  PhoneAccessInfo,
  CustomizeInfo,
  OpenSourceResult,
  UpdateStatus
} from '@shared/ipc-contract'

import { createApi } from '@shared/apiBridge'

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

  getMcpConnectorInfo: () => Promise<McpConnectorInfo>
  openMcpCertFile: () => Promise<OpenCertFileResult>
  openClaudeConfigFolder: () => Promise<OpenClaudeConfigFolderResult>

  getPhoneInfo: () => Promise<PhoneAccessInfo>
  setPhoneEnabled: (enabled: boolean) => Promise<PhoneAccessInfo>
  resetPhoneLink: () => Promise<PhoneAccessInfo>
  setPhoneAutostart: (enabled: boolean) => Promise<PhoneAccessInfo>

  getUpdateStatus: () => Promise<UpdateStatus>
  checkForUpdates: () => Promise<UpdateStatus>
  downloadUpdate: () => Promise<UpdateStatus>
  installUpdate: () => Promise<UpdateStatus>

  getCustomizeInfo: () => Promise<CustomizeInfo>
  openCustomizeSource: () => Promise<OpenSourceResult>
}

declare global {
  interface Window {
    gsApi: GsApi
  }
}

/**
 * True when running as the phone/browser build served by the desktop app
 * (no Electron preload injected window.gsApi) - desktop-only features
 * (file dialogs, PDF export, backups, MCP) are hidden there.
 */
export const isRemote = typeof window !== 'undefined' && !window.gsApi

async function remoteInvoke(channel: string, payload?: unknown): Promise<unknown> {
  // Page lives at /app/<token>/ - the token in the path is the credential.
  const base = window.location.pathname.replace(/[^/]*$/, '')
  let res: Response
  try {
    res = await fetch(`${base}api/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, payload })
    })
  } catch {
    throw new Error("Can't reach Renvor on your computer. Is it open and on the same Wi-Fi?")
  }
  const json = (await res.json().catch(() => null)) as
    | { ok: true; result: unknown }
    | { ok: false; error: string }
    | null
  if (!json) throw new Error(`Unexpected response (${res.status}) from Renvor.`)
  if (!json.ok) throw new Error(json.error)
  return json.result
}

const remoteApi = createApi(remoteInvoke, () => {}) as unknown as GsApi

export const gsApi = (): GsApi => window.gsApi ?? remoteApi
