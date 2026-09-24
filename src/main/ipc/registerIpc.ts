import { ipcMain, app } from 'electron'
import { IPC, setManySettingsInput } from '@shared/ipc-contract'
import { getAllSettings, setManySettings } from './settingsRepo'
import { getSeedSnapshot } from './debugRepo'

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.APP_GET_VERSION, () => app.getVersion())

  ipcMain.handle(IPC.SETTINGS_GET_ALL, () => getAllSettings())

  ipcMain.handle(IPC.SETTINGS_SET_MANY, (_event, payload: unknown) => {
    const parsed = setManySettingsInput.parse(payload)
    return setManySettings(parsed)
  })

  ipcMain.handle(IPC.DEBUG_GET_SEED_SNAPSHOT, () => getSeedSnapshot())
}
