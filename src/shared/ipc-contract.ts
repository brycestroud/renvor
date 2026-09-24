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
  CHECKLIST_ITEMS_REORDER: 'checklistItems:reorder'
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
  lastBackupAt: z.string().nullable().default(null)
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
