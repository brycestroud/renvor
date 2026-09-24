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
  DEBUG_GET_SEED_SNAPSHOT: 'debug:getSeedSnapshot'
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

export interface SeedSnapshotCategory {
  id: string
  key: string
  name: string
  weight: number | null
  isGsOnly: boolean
  sortOrder: number
  items: Array<{ id: string; text: string; frequency: string; sortOrder: number }>
}
