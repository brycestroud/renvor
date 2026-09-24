import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type SetManySettingsInput } from '@shared/ipc-contract'

const api = {
  getAppVersion: () => ipcRenderer.invoke(IPC.APP_GET_VERSION),
  getSettings: () => ipcRenderer.invoke(IPC.SETTINGS_GET_ALL),
  setSettings: (input: SetManySettingsInput) => ipcRenderer.invoke(IPC.SETTINGS_SET_MANY, input),
  getSeedSnapshot: () => ipcRenderer.invoke(IPC.DEBUG_GET_SEED_SNAPSHOT)
}

export type GsApi = typeof api

contextBridge.exposeInMainWorld('gsApi', api)
