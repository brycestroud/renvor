import { app } from 'electron'
import { appendFileSync, mkdirSync } from 'fs'
import { join } from 'path'

/**
 * Minimal file logger per the build spec's Section 8 ("Logs written to the
 * OS app-data folder, with an Open logs folder button in Settings"). Not a
 * full logging framework - just enough to see what happened after the fact
 * without asking the GS to run the app from a terminal.
 */
export function getLogsDir(): string {
  return app.getPath('logs')
}

/** Ensures the logs directory exists before something (e.g. "Open logs folder") tries to open it. */
export function ensureLogsDir(): string {
  const dir = getLogsDir()
  mkdirSync(dir, { recursive: true })
  return dir
}

function logFilePath(): string {
  const stamp = new Date().toISOString().slice(0, 10)
  return join(getLogsDir(), `gs-field-ops-${stamp}.log`)
}

function write(level: 'INFO' | 'WARN' | 'ERROR', message: string): void {
  try {
    mkdirSync(getLogsDir(), { recursive: true })
    const line = `[${new Date().toISOString()}] [${level}] ${message}\n`
    appendFileSync(logFilePath(), line, 'utf-8')
  } catch {
    // Logging must never crash the app it's trying to log about.
  }
}

export function logInfo(message: string): void {
  write('INFO', message)
}

export function logWarn(message: string): void {
  write('WARN', message)
}

export function logError(message: string, error?: unknown): void {
  const detail = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : error != null ? String(error) : ''
  write('ERROR', detail ? `${message}: ${detail}` : message)
}

/** Catches what would otherwise be a silent crash or an error only visible in DevTools. */
export function installGlobalErrorLogging(): void {
  process.on('uncaughtException', (error) => logError('Uncaught exception in main process', error))
  process.on('unhandledRejection', (reason) => logError('Unhandled rejection in main process', reason))
}
