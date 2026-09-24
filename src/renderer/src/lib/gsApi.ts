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
  ReorderChecklistItemsInput
} from '@shared/ipc-contract'

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
}

declare global {
  interface Window {
    gsApi: GsApi
  }
}

export const gsApi = (): GsApi => window.gsApi
