/**
 * "Customize" tab backend: an installed copy has no source code, so the
 * installer ships a source bundle (electron-builder.yml extraResources ->
 * resources/source). Opening it copies that bundle to a normal, editable
 * folder in Documents (never overwriting an existing copy the user may have
 * already changed) and reveals it. In dev the project itself is the source.
 */
import { app, shell } from 'electron'
import { cpSync, existsSync } from 'fs'
import { join } from 'path'
import type { CustomizeInfo, OpenSourceResult } from '@shared/ipc-contract'
import { getStandaloneAppDataDir } from '@shared/paths'
import { buildCustomizePrompt } from '../phone/lan'

let projectRoot = ''

export function initCustomize(opts: { projectRoot: string }): void {
  projectRoot = opts.projectRoot
}

function locations(): { sourceFolder: string; bundleFolder: string | null } {
  if (!app.isPackaged) return { sourceFolder: projectRoot, bundleFolder: null }
  return {
    sourceFolder: join(app.getPath('documents'), 'Renvor Source'),
    bundleFolder: join(process.resourcesPath, 'source')
  }
}

export function getCustomizeInfo(): CustomizeInfo {
  const { sourceFolder, bundleFolder } = locations()
  const dataFolder = getStandaloneAppDataDir()
  return {
    sourceFolder,
    sourceReady: existsSync(join(sourceFolder, 'package.json')),
    bundleAvailable: bundleFolder === null || existsSync(join(bundleFolder, 'package.json')),
    dataFolder,
    aiPrompt: buildCustomizePrompt({ sourceFolder, dataFolder })
  }
}

export async function openCustomizeSource(): Promise<OpenSourceResult> {
  const { sourceFolder, bundleFolder } = locations()
  try {
    if (!existsSync(join(sourceFolder, 'package.json'))) {
      if (!bundleFolder || !existsSync(join(bundleFolder, 'package.json'))) {
        return {
          success: false,
          error: 'This install did not include the source bundle.',
          sourceFolder: null
        }
      }
      cpSync(bundleFolder, sourceFolder, { recursive: true, force: false, errorOnExist: false })
    }
    const error = await shell.openPath(sourceFolder)
    return error
      ? { success: false, error, sourceFolder }
      : { success: true, error: null, sourceFolder }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      sourceFolder: null
    }
  }
}
