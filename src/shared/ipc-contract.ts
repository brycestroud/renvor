import { z } from 'zod'

/**
 * Single source of truth for IPC channel names + payload/response shapes.
 * The preload bridge only exposes the named functions built from this file -
 * never raw ipcRenderer - so the renderer can't send arbitrary channels.
 */

export const IPC = {
  APP_GET_VERSION: 'app:getVersion',
  SETTINGS_GET_ALL: 'settings:getAll',
  SETTINGS_SET_MANY: 'settings:setMany',

  PROJECTS_LIST: 'projects:list',
  PROJECTS_CREATE: 'projects:create',
  PROJECTS_UPDATE: 'projects:update',
  PROJECTS_ARCHIVE: 'projects:archive',

  SUPERINTENDENTS_LIST: 'superintendents:list',
  SUPERINTENDENTS_CREATE: 'superintendents:create',
  SUPERINTENDENTS_UPDATE: 'superintendents:update',
  SUPERINTENDENTS_ARCHIVE: 'superintendents:archive',

  PEOPLE_LIST: 'people:list',
  PEOPLE_CREATE: 'people:create',
  PEOPLE_UPDATE: 'people:update',
  PEOPLE_DELETE: 'people:delete',

  CATEGORIES_LIST: 'categories:list',
  CATEGORIES_UPDATE_WEIGHT: 'categories:updateWeight',

  CHECKLIST_ITEMS_CREATE: 'checklistItems:create',
  CHECKLIST_ITEMS_UPDATE: 'checklistItems:update',
  CHECKLIST_ITEMS_REORDER: 'checklistItems:reorder',

  WALKS_LIST_RECENT: 'walks:listRecent',
  WALKS_GET: 'walks:get',
  WALKS_CREATE: 'walks:create',
  WALKS_UPDATE_HEADER: 'walks:updateHeader',
  WALKS_SET_ITEM_SCORE: 'walks:setItemScore',
  WALKS_MARK_ALL_REMAINING_NA: 'walks:markAllRemainingNa',
  WALKS_SET_CATEGORY_NOTE: 'walks:setCategoryNote',
  WALKS_COPY_FROM_LAST: 'walks:copyFromLast',
  WALKS_GET_ITEM_HISTORY: 'walks:getItemHistory',
  WALKS_SUBMIT: 'walks:submit',
  WALKS_ARCHIVE: 'walks:archive',

  ACTION_ITEMS_LIST_OPEN_FOR_SUPER_PROJECT: 'actionItems:listOpenForSuperProject',
  ACTION_ITEMS_LIST_ALL: 'actionItems:listAll',
  ACTION_ITEMS_CREATE: 'actionItems:create',
  ACTION_ITEMS_UPDATE: 'actionItems:update',
  ACTION_ITEMS_TRANSITION: 'actionItems:transition',
  ACTION_ITEMS_DELETE: 'actionItems:delete',
  ACTION_ITEMS_GET_EVENTS: 'actionItems:getEvents',

  DASHBOARD_GET_MATRIX: 'dashboard:getMatrix',
  DASHBOARD_GET_SUPER_WALK_HISTORY: 'dashboard:getSuperWalkHistory',

  REPORTS_GET_WEEK_NOTES: 'reports:getWeekNotes',
  REPORTS_GET_FULL_DATA: 'reports:getFullData',
  REPORTS_GET_EXEC_DATA: 'reports:getExecData',
  REPORTS_EXPORT_FULL_PDF: 'reports:exportFullPdf',
  REPORTS_EXPORT_EXEC_PDF: 'reports:exportExecPdf',
  REPORTS_LIST_SNAPSHOTS: 'reports:listSnapshots',
  REPORTS_OPEN_SNAPSHOT_PDF: 'reports:openSnapshotPdf',

  WALKS_EXPORT_PDF: 'walks:exportPdf',

  PRINT_MARK_READY: 'print:markReady'
} as const

export const settingsSchema = z.object({
  onboardingComplete: z.boolean().default(false),
  companyName: z.string().default(''),
  logoDataUrl: z.string().nullable().default(null),
  brandPrimaryColor: z.string().default('#FF8A24'),
  brandAccentColor: z.string().default('#4EA1FF'),
  gsName: z.string().default(''),
  theme: z.enum(['light', 'dark', 'system']).default('dark'),
  needsAttentionDays: z.number().int().positive().default(14),
  weightedScoringEnabled: z.boolean().default(true),
  aiEnabled: z.boolean().default(false),
  escalationMode: z.enum(['record_only', 'mailto', 'smtp']).default('mailto'),
  backupFolder: z.string().nullable().default(null),
  lastBackupAt: z.string().nullable().default(null),
  lastPdfExportFolder: z.string().nullable().default(null)
})

export type AppSettings = z.infer<typeof settingsSchema>

export const setManySettingsInput = settingsSchema.partial()
export type SetManySettingsInput = z.infer<typeof setManySettingsInput>

const optionalEmail = z
  .string()
  .trim()
  .nullable()
  .default(null)
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /.+@.+\..+/.test(v), 'Invalid email')

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
export interface Project {
  id: string
  name: string
  number: string | null
  pmName: string | null
  pmEmail: string | null
  address: string | null
  status: 'active' | 'closed'
  procoreProjectId: string | null
  procoreCompanyId: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export const createProjectInput = z.object({
  name: z.string().trim().min(1, 'Project name is required'),
  number: z.string().trim().nullable().default(null),
  pmName: z.string().trim().nullable().default(null),
  pmEmail: optionalEmail,
  address: z.string().trim().nullable().default(null),
  status: z.enum(['active', 'closed']).default('active')
})
export type CreateProjectInput = z.infer<typeof createProjectInput>

export const updateProjectInput = createProjectInput.partial().extend({ id: z.string() })
export type UpdateProjectInput = z.infer<typeof updateProjectInput>

// ---------------------------------------------------------------------------
// Superintendents (+ custom fields)
// ---------------------------------------------------------------------------
export interface SuperCustomField {
  id: string
  label: string
  value: string
  sortOrder: number
}

export interface Superintendent {
  id: string
  name: string
  phone: string | null
  email: string | null
  yearsExperience: number | null
  homeProjectId: string | null
  nccerStatus: 'not_started' | 'in_progress' | 'completed'
  notes: string | null
  active: boolean
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  customFields: SuperCustomField[]
}

const customFieldInput = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1),
  value: z.string().trim(),
  sortOrder: z.number().int().default(0)
})

export const createSuperintendentInput = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone: z.string().trim().nullable().default(null),
  email: optionalEmail,
  yearsExperience: z.number().nullable().default(null),
  homeProjectId: z.string().nullable().default(null),
  nccerStatus: z.enum(['not_started', 'in_progress', 'completed']).default('not_started'),
  notes: z.string().trim().nullable().default(null),
  active: z.boolean().default(true),
  customFields: z.array(customFieldInput).default([])
})
export type CreateSuperintendentInput = z.infer<typeof createSuperintendentInput>

export const updateSuperintendentInput = createSuperintendentInput
  .partial()
  .extend({ id: z.string() })
export type UpdateSuperintendentInput = z.infer<typeof updateSuperintendentInput>

// ---------------------------------------------------------------------------
// People (report recipients / escalation contacts)
// ---------------------------------------------------------------------------
export interface Person {
  id: string
  name: string
  title: string | null
  email: string
  role: 'vp_ops' | 'executive' | 'pm' | 'other'
  receivesFullReport: boolean
  receivesExecSummary: boolean
  createdAt: string
  updatedAt: string
}

export const createPersonInput = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  title: z.string().trim().nullable().default(null),
  email: z.string().trim().email('Valid email required'),
  role: z.enum(['vp_ops', 'executive', 'pm', 'other']).default('other'),
  receivesFullReport: z.boolean().default(false),
  receivesExecSummary: z.boolean().default(false)
})
export type CreatePersonInput = z.infer<typeof createPersonInput>

export const updatePersonInput = createPersonInput.partial().extend({ id: z.string() })
export type UpdatePersonInput = z.infer<typeof updatePersonInput>

// ---------------------------------------------------------------------------
// Categories (weight editing only - names/items come from checklist editor)
// ---------------------------------------------------------------------------
export interface CategoryWithItems {
  id: string
  key: string
  name: string
  weight: number | null
  isGsOnly: boolean
  sortOrder: number
  active: boolean
  items: ChecklistItemDto[]
}

export interface ChecklistItemDto {
  id: string
  categoryId: string
  text: string
  frequency: 'weekly' | 'monthly' | 'once_per_job'
  isCustom: boolean
  sortOrder: number
  active: boolean
}

export const updateCategoryWeightInput = z.object({
  id: z.string(),
  weight: z.number().nullable()
})
export type UpdateCategoryWeightInput = z.infer<typeof updateCategoryWeightInput>

// ---------------------------------------------------------------------------
// Checklist items
// ---------------------------------------------------------------------------
export const createChecklistItemInput = z.object({
  categoryId: z.string(),
  text: z.string().trim().min(1, 'Item text is required'),
  frequency: z.enum(['weekly', 'monthly', 'once_per_job']).default('weekly')
})
export type CreateChecklistItemInput = z.infer<typeof createChecklistItemInput>

export const updateChecklistItemInput = z.object({
  id: z.string(),
  text: z.string().trim().min(1).optional(),
  frequency: z.enum(['weekly', 'monthly', 'once_per_job']).optional(),
  active: z.boolean().optional()
})
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemInput>

export const reorderChecklistItemsInput = z.object({
  categoryId: z.string(),
  orderedIds: z.array(z.string())
})
export type ReorderChecklistItemsInput = z.infer<typeof reorderChecklistItemsInput>

// ---------------------------------------------------------------------------
// Walks
// ---------------------------------------------------------------------------
export type VisitType = 'home' | 'cross_project'
export type WalkStatus = 'draft' | 'submitted'

export interface WalkListItem {
  id: string
  date: string
  superintendentId: string
  superintendentName: string
  projectId: string
  projectName: string
  visitType: VisitType
  status: WalkStatus
  submittedAt: string | null
  updatedAt: string
}

export interface WalkItemScoreDto {
  id: string
  checklistItemId: string
  categoryId: string
  itemTextSnapshot: string
  score: number | null
  isNa: boolean
}

export interface WalkCategoryNoteDto {
  categoryId: string
  notes: string
}

export interface WalkDetail {
  id: string
  date: string
  superintendentId: string
  superintendentName: string
  projectId: string
  projectName: string
  pmNameSnapshot: string | null
  visitType: VisitType
  overallNotes: string | null
  followupNotes: string | null
  status: WalkStatus
  submittedAt: string | null
  lastEditedAt: string | null
  createdAt: string
  updatedAt: string
  itemScores: WalkItemScoreDto[]
  categoryNotes: WalkCategoryNoteDto[]
}

export const createWalkInput = z.object({
  date: z.string(),
  superintendentId: z.string(),
  projectId: z.string(),
  visitType: z.enum(['home', 'cross_project'])
})
export type CreateWalkInput = z.infer<typeof createWalkInput>

export const updateWalkHeaderInput = z.object({
  id: z.string(),
  date: z.string().optional(),
  superintendentId: z.string().optional(),
  projectId: z.string().optional(),
  visitType: z.enum(['home', 'cross_project']).optional(),
  overallNotes: z.string().nullable().optional(),
  followupNotes: z.string().nullable().optional()
})
export type UpdateWalkHeaderInput = z.infer<typeof updateWalkHeaderInput>

export const setItemScoreInput = z.object({
  walkId: z.string(),
  checklistItemId: z.string(),
  score: z.number().int().min(1).max(5).nullable(),
  isNa: z.boolean()
})
export type SetItemScoreInput = z.infer<typeof setItemScoreInput>

export const markAllRemainingNaInput = z.object({
  walkId: z.string()
})
export type MarkAllRemainingNaInput = z.infer<typeof markAllRemainingNaInput>

export const setCategoryNoteInput = z.object({
  walkId: z.string(),
  categoryId: z.string(),
  notes: z.string()
})
export type SetCategoryNoteInput = z.infer<typeof setCategoryNoteInput>

export const copyFromLastWalkInput = z.object({
  walkId: z.string()
})
export type CopyFromLastWalkInput = z.infer<typeof copyFromLastWalkInput>

export const getItemHistoryInput = z.object({
  superintendentId: z.string(),
  projectId: z.string(),
  excludeWalkId: z.string().optional()
})
export type GetItemHistoryInput = z.infer<typeof getItemHistoryInput>

export interface ItemHistoryRecord {
  checklistItemId: string
  date: string
  wasScored: boolean
}

export const submitWalkInput = z.object({ id: z.string() })
export type SubmitWalkInput = z.infer<typeof submitWalkInput>

// ---------------------------------------------------------------------------
// Action items (full CRUD/filter UI lands in Phase 4 - this is the subset
// the Job Walk screen needs: reviewing open items and adding new ones)
// ---------------------------------------------------------------------------
export interface ActionItemDto {
  id: string
  text: string
  ownerType: 'gs' | 'superintendent' | 'pm'
  superintendentId: string | null
  projectId: string | null
  dueDate: string | null
  priority: 'high' | 'medium' | 'low'
  status: 'open' | 'carried' | 'closed' | 'escalated'
  source: 'walk' | 'manual' | 'ai_text' | 'ai_walk_scan' | 'procore'
  sourceSummary: string | null
  originWalkId: string | null
  includeInReport: boolean
  closedAt: string | null
  createdAt: string
}

export const listOpenActionItemsInput = z.object({
  superintendentId: z.string(),
  projectId: z.string()
})
export type ListOpenActionItemsInput = z.infer<typeof listOpenActionItemsInput>

export const createActionItemInput = z.object({
  text: z.string().trim().min(1),
  ownerType: z.enum(['gs', 'superintendent', 'pm']).default('superintendent'),
  superintendentId: z.string().nullable().default(null),
  projectId: z.string().nullable().default(null),
  dueDate: z.string().nullable().default(null),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  source: z.enum(['walk', 'manual', 'ai_text', 'ai_walk_scan', 'procore']).default('manual'),
  originWalkId: z.string().nullable().default(null)
})
export type CreateActionItemInput = z.infer<typeof createActionItemInput>

export const transitionActionItemInput = z.object({
  id: z.string(),
  event: z.enum(['closed', 'carried', 'escalated', 'de_escalated', 'reopened']),
  note: z.string().nullable().default(null),
  notified: z.array(z.string()).default([]),
  walkId: z.string().nullable().default(null)
})
export type TransitionActionItemInput = z.infer<typeof transitionActionItemInput>

export interface ActionItemListDto extends ActionItemDto {
  superintendentName: string | null
  projectName: string | null
}

export const updateActionItemInput = z.object({
  id: z.string(),
  text: z.string().trim().min(1).optional(),
  ownerType: z.enum(['gs', 'superintendent', 'pm']).optional(),
  superintendentId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  includeInReport: z.boolean().optional()
})
export type UpdateActionItemInput = z.infer<typeof updateActionItemInput>

export interface ActionItemEventDto {
  id: string
  event: 'created' | 'edited' | 'carried' | 'closed' | 'escalated' | 'de_escalated' | 'reopened'
  walkId: string | null
  note: string | null
  notifiedNames: string[]
  createdAt: string
}

export const getActionItemEventsInput = z.object({ actionItemId: z.string() })
export type GetActionItemEventsInput = z.infer<typeof getActionItemEventsInput>

// ---------------------------------------------------------------------------
// Dashboard (matrix + superintendent trend/history)
// ---------------------------------------------------------------------------
export interface MatrixCategoryScore {
  categoryId: string
  average: number | null
}

export interface MatrixRow {
  superintendentId: string
  name: string
  homeProjectId: string | null
  homeProjectName: string | null
  walksInRange: number
  lastWalkDate: string | null
  categoryScores: MatrixCategoryScore[]
}

export interface DashboardMatrix {
  rows: MatrixRow[]
  walksThisWeekCount: number
}

export const getMatrixInput = z.object({ from: z.string(), to: z.string() })
export type GetMatrixInput = z.infer<typeof getMatrixInput>

export interface WalkHistoryEntry {
  walkId: string
  date: string
  projectId: string
  projectName: string
  visitType: VisitType
  status: WalkStatus
  categoryScores: MatrixCategoryScore[]
}

// ---------------------------------------------------------------------------
// Reports & PDF
// ---------------------------------------------------------------------------
export type ReportType = 'full' | 'executive'

export interface WeekNote {
  /** Synthetic id: `${walkId}:overall` | `${walkId}:followup` | `${walkId}:cat:${categoryId}` */
  id: string
  walkId: string
  superintendentName: string
  projectName: string
  source: 'overall' | 'followup' | 'category'
  categoryName: string | null
  text: string
}

export interface RedFlag {
  walkId: string
  superintendentName: string
  projectName: string
  categoryName: string
  score: number
}

export interface ReportWalkSection {
  walkId: string
  date: string
  superintendentName: string
  projectName: string
  visitType: VisitType
  overallScore: number | null
  categoryScores: Array<{ categoryId: string; categoryName: string; average: number | null }>
  overallNotes: string | null
  followupNotes: string | null
  categoryNotes: Array<{ categoryName: string; notes: string }>
}

export interface ReportSummaryStats {
  walksCompleted: number
  supersWalked: number
  totalActiveSupers: number
  averageScore: number | null
}

export interface ReportEscalatedItem {
  id: string
  text: string
  superintendentName: string | null
  projectName: string | null
}

export interface FullReportData {
  companyName: string
  preparedBy: string
  weekStart: string
  weekEnd: string
  escalatedItems: ReportEscalatedItem[]
  summary: ReportSummaryStats
  redFlags: RedFlag[]
  walks: ReportWalkSection[]
  actionItemsOpened: number
  actionItemsClosed: number
  actionItemsOverdue: number
  supersNotWalked: string[]
}

export const getWeekReportInput = z.object({ weekStart: z.string() })
export type GetWeekReportInput = z.infer<typeof getWeekReportInput>

export interface ExecSummaryData {
  companyName: string
  preparedBy: string
  weekStart: string
  weekEnd: string
  summary: ReportSummaryStats
  escalatedItems: ReportEscalatedItem[]
  redFlags: RedFlag[]
  selectedNotes: WeekNote[]
}

export const getExecSummaryDataInput = z.object({
  weekStart: z.string(),
  selectedNoteIds: z.array(z.string())
})
export type GetExecSummaryDataInput = z.infer<typeof getExecSummaryDataInput>

export const exportExecSummaryPdfInput = getExecSummaryDataInput
export type ExportExecSummaryPdfInput = z.infer<typeof exportExecSummaryPdfInput>

export interface PdfExportResult {
  canceled: boolean
  path: string | null
}

export interface ReportSnapshotDto {
  id: string
  reportType: ReportType
  weekStart: string
  pdfPath: string | null
  preparedBy: string | null
  createdAt: string
}

export interface OpenSnapshotResult {
  success: boolean
  error: string | null
}

export const exportWalkPdfInput = z.object({ walkId: z.string() })
export type ExportWalkPdfInput = z.infer<typeof exportWalkPdfInput>
