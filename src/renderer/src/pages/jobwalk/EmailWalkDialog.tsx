import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { gsApi } from '../../lib/gsApi'
import type { WalkDetail } from '@shared/ipc-contract'

/**
 * mailto: links can't carry file attachments - that's a hard platform
 * limitation (no browser/OS mail client exposes attachment access through
 * the mailto URI scheme for security reasons), not something we chose to
 * skip. This opens a pre-filled email and tells the GS to attach the PDF
 * they just exported (or are about to) manually.
 */
export function EmailWalkDialog({ walk, onClose }: { walk: WalkDetail; onClose: () => void }): JSX.Element {
  const { data: people } = useQuery({ queryKey: ['people'], queryFn: () => gsApi().listPeople() })
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => gsApi().getSettings() })
  const [selected, setSelected] = useState<string[]>([])

  function toggle(id: string): void {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function send(): void {
    const recipients = (people ?? []).filter((p) => selected.includes(p.id)).map((p) => p.email)
    const subject = `Job Walk - ${walk.superintendentName} - ${walk.projectName} - ${walk.date}`
    const body = [
      `From: ${settings?.gsName || 'GS'}`,
      `Superintendent: ${walk.superintendentName}`,
      `Project: ${walk.projectName}`,
      `Date: ${walk.date}`,
      '',
      'Remember to attach the exported walk PDF - mailto links cannot attach files automatically.'
    ].join('\n')
    const mailto = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailto)
    onClose()
  }

  return (
    <Modal title="Email Walk To…" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-xs text-text-muted">
          Opens a pre-filled email in your default mail app. Attach the exported PDF yourself - mailto
          links can't do that automatically.
        </p>
        <div>
          <p className="mb-1.5 text-sm text-text-secondary">Recipients</p>
          {(people?.length ?? 0) === 0 && (
            <p className="text-xs text-text-muted">No one in Settings &gt; People yet.</p>
          )}
          <div className="flex flex-col gap-1.5">
            {people?.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  onChange={() => toggle(p.id)}
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                {p.name} <span className="text-text-muted">({p.email})</span>
              </label>
            ))}
          </div>
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-control border border-border bg-surface-2 px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            onClick={send}
            disabled={selected.length === 0}
            className="rounded-control bg-brand px-4 py-2 text-sm font-medium text-[#171200] hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Open Email
          </button>
        </div>
      </div>
    </Modal>
  )
}
