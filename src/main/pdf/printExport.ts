import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { join } from 'path'
import { writeFile } from 'fs/promises'
import { IPC } from '@shared/ipc-contract'
import type { PdfExportResult } from '@shared/ipc-contract'
import { getAllSettings, setManySettings } from '../ipc/settingsRepo'
import { getFullReportData, getExecSummaryData, saveReportSnapshot } from '../ipc/reportsRepo'
import { getWalk } from '../ipc/walksRepo'

function loadAppRoute(win: BrowserWindow, hashPath: string): Promise<void> {
  const isDev = !app.isPackaged
  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    return win.loadURL(`${process.env.ELECTRON_RENDERER_URL}#${hashPath}`)
  }
  return win.loadFile(join(__dirname, '../renderer/index.html'), { hash: hashPath })
}

/** Renders a hidden window at a print route and waits for it to signal readiness via PRINT_MARK_READY. */
async function printRouteToBuffer(hashPath: string): Promise<Buffer> {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  try {
    const ready = new Promise<void>((resolve) => {
      ipcMain.once(IPC.PRINT_MARK_READY, () => resolve())
    })
    await loadAppRoute(win, hashPath)

    const timeout = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('Print route did not signal ready in time')), 10_000)
    )
    await Promise.race([ready, timeout])

    return await win.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: 'Letter',
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    })
  } finally {
    win.destroy()
  }
}

async function pickSaveLocation(suggestedFilename: string): Promise<string | null> {
  const settings = getAllSettings()
  const defaultPath = join(settings.lastPdfExportFolder ?? app.getPath('documents'), suggestedFilename)

  const result = await dialog.showSaveDialog({
    title: 'Export PDF',
    defaultPath,
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (result.canceled || !result.filePath) return null

  const folder = result.filePath.slice(0, Math.max(result.filePath.lastIndexOf('\\'), result.filePath.lastIndexOf('/')))
  setManySettings({ lastPdfExportFolder: folder })
  return result.filePath
}

function safeFilePart(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, '-').trim()
}

export async function exportWalkPdf(walkId: string): Promise<PdfExportResult> {
  const walk = getWalk(walkId)
  const suggested = `Renvor-Walk_${safeFilePart(walk.superintendentName)}_${walk.date}.pdf`
  const filePath = await pickSaveLocation(suggested)
  if (!filePath) return { canceled: true, path: null }

  const buffer = await printRouteToBuffer(`/print/walk/${walkId}`)
  await writeFile(filePath, buffer)
  return { canceled: false, path: filePath }
}

export async function exportFullReportPdf(weekStart: string): Promise<PdfExportResult> {
  const data = getFullReportData(weekStart)
  const suggested = `Renvor-Report_Full_${weekStart}.pdf`
  const filePath = await pickSaveLocation(suggested)
  if (!filePath) return { canceled: true, path: null }

  const buffer = await printRouteToBuffer(`/print/report/full/${weekStart}`)
  await writeFile(filePath, buffer)
  saveReportSnapshot('full', weekStart, data, filePath, data.preparedBy || null)
  return { canceled: false, path: filePath }
}

export async function exportExecSummaryPdf(
  weekStart: string,
  selectedNoteIds: string[]
): Promise<PdfExportResult> {
  const data = getExecSummaryData(weekStart, selectedNoteIds)
  const suggested = `Renvor-Report_Exec_${weekStart}.pdf`
  const filePath = await pickSaveLocation(suggested)
  if (!filePath) return { canceled: true, path: null }

  const notesParam = encodeURIComponent(selectedNoteIds.join(','))
  const buffer = await printRouteToBuffer(`/print/report/executive/${weekStart}?notes=${notesParam}`)
  await writeFile(filePath, buffer)
  saveReportSnapshot('executive', weekStart, data, filePath, data.preparedBy || null)
  return { canceled: false, path: filePath }
}
