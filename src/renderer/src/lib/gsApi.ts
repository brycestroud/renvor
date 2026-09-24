import type { AppSettings, SetManySettingsInput, SeedSnapshotCategory } from '@shared/ipc-contract'

export interface GsApi {
  getAppVersion: () => Promise<string>
  getSettings: () => Promise<AppSettings>
  setSettings: (input: SetManySettingsInput) => Promise<AppSettings>
  getSeedSnapshot: () => Promise<SeedSnapshotCategory[]>
}

declare global {
  interface Window {
    gsApi: GsApi
  }
}

export const gsApi = (): GsApi => window.gsApi
