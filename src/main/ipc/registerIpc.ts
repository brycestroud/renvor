import { ipcMain, app } from 'electron'
import {
  IPC,
  setManySettingsInput,
  createProjectInput,
  updateProjectInput,
  createSuperintendentInput,
  updateSuperintendentInput,
  createPersonInput,
  updatePersonInput,
  updateCategoryWeightInput,
  createChecklistItemInput,
  updateChecklistItemInput,
  reorderChecklistItemsInput
} from '@shared/ipc-contract'
import { getAllSettings, setManySettings } from './settingsRepo'
import { listProjects, createProject, updateProject, archiveProject } from './projectsRepo'
import {
  listSuperintendents,
  createSuperintendent,
  updateSuperintendent,
  archiveSuperintendent
} from './superintendentsRepo'
import { listPeople, createPerson, updatePerson, deletePerson } from './peopleRepo'
import { listCategoriesWithItems, updateCategoryWeight } from './categoriesRepo'
import {
  createChecklistItem,
  updateChecklistItem,
  reorderChecklistItems
} from './checklistItemsRepo'

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.APP_GET_VERSION, () => app.getVersion())

  ipcMain.handle(IPC.SETTINGS_GET_ALL, () => getAllSettings())
  ipcMain.handle(IPC.SETTINGS_SET_MANY, (_e, payload: unknown) =>
    setManySettings(setManySettingsInput.parse(payload))
  )

  ipcMain.handle(IPC.PROJECTS_LIST, () => listProjects())
  ipcMain.handle(IPC.PROJECTS_CREATE, (_e, payload: unknown) =>
    createProject(createProjectInput.parse(payload))
  )
  ipcMain.handle(IPC.PROJECTS_UPDATE, (_e, payload: unknown) =>
    updateProject(updateProjectInput.parse(payload))
  )
  ipcMain.handle(IPC.PROJECTS_ARCHIVE, (_e, id: string) => archiveProject(id))

  ipcMain.handle(IPC.SUPERINTENDENTS_LIST, () => listSuperintendents())
  ipcMain.handle(IPC.SUPERINTENDENTS_CREATE, (_e, payload: unknown) =>
    createSuperintendent(createSuperintendentInput.parse(payload))
  )
  ipcMain.handle(IPC.SUPERINTENDENTS_UPDATE, (_e, payload: unknown) =>
    updateSuperintendent(updateSuperintendentInput.parse(payload))
  )
  ipcMain.handle(IPC.SUPERINTENDENTS_ARCHIVE, (_e, id: string) => archiveSuperintendent(id))

  ipcMain.handle(IPC.PEOPLE_LIST, () => listPeople())
  ipcMain.handle(IPC.PEOPLE_CREATE, (_e, payload: unknown) =>
    createPerson(createPersonInput.parse(payload))
  )
  ipcMain.handle(IPC.PEOPLE_UPDATE, (_e, payload: unknown) =>
    updatePerson(updatePersonInput.parse(payload))
  )
  ipcMain.handle(IPC.PEOPLE_DELETE, (_e, id: string) => deletePerson(id))

  ipcMain.handle(IPC.CATEGORIES_LIST, () => listCategoriesWithItems())
  ipcMain.handle(IPC.CATEGORIES_UPDATE_WEIGHT, (_e, payload: unknown) =>
    updateCategoryWeight(updateCategoryWeightInput.parse(payload))
  )

  ipcMain.handle(IPC.CHECKLIST_ITEMS_CREATE, (_e, payload: unknown) =>
    createChecklistItem(createChecklistItemInput.parse(payload))
  )
  ipcMain.handle(IPC.CHECKLIST_ITEMS_UPDATE, (_e, payload: unknown) =>
    updateChecklistItem(updateChecklistItemInput.parse(payload))
  )
  ipcMain.handle(IPC.CHECKLIST_ITEMS_REORDER, (_e, payload: unknown) =>
    reorderChecklistItems(reorderChecklistItemsInput.parse(payload))
  )
}
