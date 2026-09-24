import { contextBridge, ipcRenderer } from 'electron'
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
  type ReorderChecklistItemsInput
} from '@shared/ipc-contract'

const api = {
  getAppVersion: () => ipcRenderer.invoke(IPC.APP_GET_VERSION),
  getSettings: () => ipcRenderer.invoke(IPC.SETTINGS_GET_ALL),
  setSettings: (input: SetManySettingsInput) => ipcRenderer.invoke(IPC.SETTINGS_SET_MANY, input),

  listProjects: () => ipcRenderer.invoke(IPC.PROJECTS_LIST),
  createProject: (input: CreateProjectInput) => ipcRenderer.invoke(IPC.PROJECTS_CREATE, input),
  updateProject: (input: UpdateProjectInput) => ipcRenderer.invoke(IPC.PROJECTS_UPDATE, input),
  archiveProject: (id: string) => ipcRenderer.invoke(IPC.PROJECTS_ARCHIVE, id),

  listSuperintendents: () => ipcRenderer.invoke(IPC.SUPERINTENDENTS_LIST),
  createSuperintendent: (input: CreateSuperintendentInput) =>
    ipcRenderer.invoke(IPC.SUPERINTENDENTS_CREATE, input),
  updateSuperintendent: (input: UpdateSuperintendentInput) =>
    ipcRenderer.invoke(IPC.SUPERINTENDENTS_UPDATE, input),
  archiveSuperintendent: (id: string) => ipcRenderer.invoke(IPC.SUPERINTENDENTS_ARCHIVE, id),

  listPeople: () => ipcRenderer.invoke(IPC.PEOPLE_LIST),
  createPerson: (input: CreatePersonInput) => ipcRenderer.invoke(IPC.PEOPLE_CREATE, input),
  updatePerson: (input: UpdatePersonInput) => ipcRenderer.invoke(IPC.PEOPLE_UPDATE, input),
  deletePerson: (id: string) => ipcRenderer.invoke(IPC.PEOPLE_DELETE, id),

  listCategories: () => ipcRenderer.invoke(IPC.CATEGORIES_LIST),
  updateCategoryWeight: (input: UpdateCategoryWeightInput) =>
    ipcRenderer.invoke(IPC.CATEGORIES_UPDATE_WEIGHT, input),

  createChecklistItem: (input: CreateChecklistItemInput) =>
    ipcRenderer.invoke(IPC.CHECKLIST_ITEMS_CREATE, input),
  updateChecklistItem: (input: UpdateChecklistItemInput) =>
    ipcRenderer.invoke(IPC.CHECKLIST_ITEMS_UPDATE, input),
  reorderChecklistItems: (input: ReorderChecklistItemsInput) =>
    ipcRenderer.invoke(IPC.CHECKLIST_ITEMS_REORDER, input)
}

export type GsApi = typeof api

contextBridge.exposeInMainWorld('gsApi', api)
