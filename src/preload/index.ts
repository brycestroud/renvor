import { contextBridge, ipcRenderer } from 'electron'
import { createApi } from '@shared/apiBridge'

const api = createApi(
  (channel, payload) => ipcRenderer.invoke(channel, payload),
  (channel) => ipcRenderer.send(channel)
)

export type GsApi = typeof api

contextBridge.exposeInMainWorld('gsApi', api)
