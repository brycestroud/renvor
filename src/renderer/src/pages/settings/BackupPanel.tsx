import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DatabaseBackup, Download, Upload, FileArchive } from 'lucide-react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { gsApi } from '../../lib/gsApi'
import type {
  BackupFileInfo,
  JsonImportPickResult,
  LegacyImportPickResult
} from '@shared/ipc-contract'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

export function BackupPanel(): JSX.Element {
  const queryClient = useQueryClient()
  const { data: backups, isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: () => gsApi().listBackups()
  })

  const [message, setMessage] = useState<string | null>(null)
  const [restoring, setRestoring] = useState<BackupFileInfo | null>(null)
  const [importJsonPreview, setImportJsonPreview] = useState<JsonImportPickResult | null>(null)
  const [legacyPreview, setLegacyPreview] = useState<LegacyImportPickResult | null>(null)

  const backupNow = useMutation({
    mutationFn: () => gsApi().backupNow(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] })
      setMessage('Backup created.')
    },
    onError: (e: Error) => setMessage(`Backup failed: ${e.message}`)
  })

  const restore = useMutation({
    mutationFn: (fileName: string) => gsApi().restoreBackup({ fileName }),
    onSuccess: (result) => {
      if (!result.success) {
        setMessage(`Restore failed: ${result.error}`)
        setRestoring(null)
        return
      }
      setMessage('Restoring — the app will relaunch in a moment.')
    },
    onError: (e: Error) => setMessage(`Restore failed: ${e.message}`)
  })

  const exportJson = useMutation({
    mutationFn: () => gsApi().exportDataJson(),
    onSuccess: (result) => {
      setMessage(result.canceled ? null : `Exported to ${result.path}`)
    },
    onError: (e: Error) => setMessage(`Export failed: ${e.message}`)
  })

  const pickImportJson = useMutation({
    mutationFn: () => gsApi().importDataJsonPick(),
    onSuccess: (result) => {
      if (result.canceled) return
      setImportJsonPreview(result)
    },
    onError: (e: Error) => setMessage(`Import failed: ${e.message}`)
  })

  const commitImportJson = useMutation({
    mutationFn: (filePath: string) => gsApi().importDataJsonCommit({ filePath }),
    onSuccess: (result) => {
      setImportJsonPreview(null)
      setMessage(result.success ? 'Data imported. Restart the app to see the changes reflected everywhere.' : `Import failed: ${result.error}`)
      queryClient.invalidateQueries()
    },
    onError: (e: Error) => setMessage(`Import failed: ${e.message}`)
  })

  const pickLegacyImport = useMutation({
    mutationFn: () => gsApi().legacyImportPickAndPreview(),
    onSuccess: (result) => {
      if (result.canceled) return
      setLegacyPreview(result)
    },
    onError: (e: Error) => setMessage(`Legacy import failed: ${e.message}`)
  })

  const commitLegacyImport = useMutation({
    mutationFn: (filePath: string) => gsApi().legacyImportCommit({ filePath }),
    onSuccess: (result) => {
      setLegacyPreview(null)
      if (!result.success) {
        setMessage(`Legacy import failed: ${result.error}`)
        return
      }
      const i = result.imported!
      setMessage(
        `Imported ${i.supers} supers, ${i.projects} projects, ${i.walks} walks, ${i.actionItems} action items.`
      )
      queryClient.invalidateQueries()
    },
    onError: (e: Error) => setMessage(`Legacy import failed: ${e.message}`)
  })

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Backup &amp; Data</h2>
        <p className="mt-1 text-xs text-text-muted">
          The app backs itself up automatically once a day and on every close. Everything lives
          locally — nothing here touches a server.
        </p>
      </div>

      {message && (
        <p className="rounded-control border border-border-subtle bg-surface-2 px-3 py-2 text-xs text-text-secondary">
          {message}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Backups
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              The 30 most recent backups are kept; older ones are pruned automatically.
            </p>
          </div>
          <button
            onClick={() => backupNow.mutate()}
            disabled={backupNow.isPending}
            className="flex items-center gap-1.5 rounded-control bg-brand px-3 py-1.5 text-xs font-medium text-[#171200] hover:bg-brand-hover disabled:opacity-60"
          >
            <DatabaseBackup size={14} />
            {backupNow.isPending ? 'Backing up…' : 'Back up now'}
          </button>
        </div>

        {isLoading && <p className="text-sm text-text-muted">Loading…</p>}

        {!isLoading && (backups?.length ?? 0) === 0 && (
          <p className="rounded-control border border-dashed border-border-subtle px-4 py-6 text-center text-sm text-text-muted">
            No backups yet.
          </p>
        )}

        {!isLoading && (backups?.length ?? 0) > 0 && (
          <div className="overflow-hidden rounded-control border border-border-subtle">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-2 text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-3 py-2 font-medium">File</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                  <th className="px-3 py-2 font-medium">Size</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups!.map((b) => (
                  <tr key={b.fileName} className="border-b border-border-subtle last:border-0 hover:bg-surface-hover">
                    <td className="px-3 py-2.5 font-mono text-xs text-text-primary">{b.fileName}</td>
                    <td className="px-3 py-2.5 text-text-secondary">{formatDate(b.createdAt)}</td>
                    <td className="px-3 py-2.5 text-text-secondary">{formatBytes(b.sizeBytes)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button onClick={() => setRestoring(b)} className="text-xs text-danger hover:underline">
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border-subtle pt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Export &amp; Import
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => exportJson.mutate()}
            disabled={exportJson.isPending}
            className="flex items-center gap-1.5 rounded-control border border-border bg-surface-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-60"
          >
            <Download size={14} /> Export all data to JSON
          </button>
          <button
            onClick={() => pickImportJson.mutate()}
            disabled={pickImportJson.isPending}
            className="flex items-center gap-1.5 rounded-control border border-border bg-surface-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-60"
          >
            <Upload size={14} /> Import from JSON
          </button>
        </div>
        <p className="text-xs text-text-muted">
          Import replaces all current data with the contents of the chosen file. A safety backup
          is taken automatically first.
        </p>
      </div>

      <div className="flex flex-col gap-3 border-t border-border-subtle pt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Legacy Prototype Import
        </h3>
        <p className="text-xs text-text-muted">
          One-time import from the old web prototype&apos;s JSON export. Matches checklist items
          by text where possible; anything that doesn&apos;t match becomes an inactive custom
          item so historical walks stay intact.
        </p>
        <button
          onClick={() => pickLegacyImport.mutate()}
          disabled={pickLegacyImport.isPending}
          className="flex w-fit items-center gap-1.5 rounded-control border border-border bg-surface-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover disabled:opacity-60"
        >
          <FileArchive size={14} /> Choose legacy export file…
        </button>
      </div>

      {restoring && (
        <ConfirmDialog
          title="Restore this backup?"
          description={`This replaces all current data with "${restoring.fileName}". A safety backup of the current data is taken first, then the app relaunches.`}
          confirmLabel="Restore & relaunch"
          danger
          pending={restore.isPending}
          onConfirm={() => restore.mutate(restoring.fileName)}
          onCancel={() => setRestoring(null)}
        />
      )}

      {importJsonPreview && importJsonPreview.valid && (
        <ConfirmDialog
          title="Import this file?"
          description={`This replaces all current data with the contents of "${importJsonPreview.filePath}" (${Object.entries(
            importJsonPreview.counts ?? {}
          )
            .map(([table, count]) => `${count} ${table}`)
            .join(', ')}). A safety backup is taken first.`}
          confirmLabel="Import & replace"
          danger
          pending={commitImportJson.isPending}
          onConfirm={() => commitImportJson.mutate(importJsonPreview.filePath!)}
          onCancel={() => setImportJsonPreview(null)}
        />
      )}

      {importJsonPreview && !importJsonPreview.valid && (
        <ConfirmDialog
          title="Can't import this file"
          description={importJsonPreview.error ?? 'Unknown error.'}
          confirmLabel="OK"
          onConfirm={() => setImportJsonPreview(null)}
          onCancel={() => setImportJsonPreview(null)}
        />
      )}

      {legacyPreview && legacyPreview.valid && legacyPreview.preview && (
        <ConfirmDialog
          title="Import legacy data?"
          description={`Found ${legacyPreview.preview.supers} supers, ${legacyPreview.preview.projects} projects, ${legacyPreview.preview.walks} walks, ${legacyPreview.preview.actionItems} action items. ${legacyPreview.preview.matchedChecklistItems} checklist items matched, ${legacyPreview.preview.unmatchedChecklistItems} unmatched.${legacyPreview.preview.warnings.length ? ` ${legacyPreview.preview.warnings.length} warning(s).` : ''}`}
          confirmLabel="Import"
          pending={commitLegacyImport.isPending}
          onConfirm={() => commitLegacyImport.mutate(legacyPreview.filePath!)}
          onCancel={() => setLegacyPreview(null)}
        />
      )}

      {legacyPreview && !legacyPreview.valid && (
        <ConfirmDialog
          title="Can't import this file"
          description={legacyPreview.error ?? 'Unknown error.'}
          confirmLabel="OK"
          onConfirm={() => setLegacyPreview(null)}
          onCancel={() => setLegacyPreview(null)}
        />
      )}
    </div>
  )
}
