import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CopyButton } from '../../components/CopyButton'
import { gsApi } from '../../lib/gsApi'

export function CustomizePanel(): JSX.Element {
  const queryClient = useQueryClient()
  const { data: info } = useQuery({
    queryKey: ['customize-info'],
    queryFn: () => gsApi().getCustomizeInfo()
  })
  const open = useMutation({
    mutationFn: () => gsApi().openCustomizeSource(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customize-info'] })
  })

  if (!info) return <p className="text-sm text-text-muted">Loading…</p>

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Customize</h2>
        <p className="mt-1 text-xs text-text-muted">
          Renvor ships with its own source code, so anyone who installs it can change how it
          works - new screens, different scoring rules, extra fields - by handing an AI coding
          tool (Claude Code, Cursor, and similar) the prompt below. Your data is never touched by
          code changes.
        </p>
      </div>

      <div className="rounded-control border border-border-subtle bg-surface-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Steps</p>
        <ol className="mt-2 list-inside list-decimal space-y-2 text-xs text-text-secondary">
          <li>
            Click <span className="font-semibold text-text-primary">Open source folder</span>. The
            first time, Renvor copies its source to a normal folder you can edit
            {info.sourceReady ? '' : ' (it isn’t there yet)'}.
          </li>
          <li>
            Open that folder in your AI coding tool (in Claude Code:{' '}
            <code className="rounded bg-canvas px-1 py-0.5 font-mono text-[11px]">cd</code> into it
            and run <code className="rounded bg-canvas px-1 py-0.5 font-mono text-[11px]">claude</code>).
          </li>
          <li>Paste the prompt below, then tell it what you want changed.</li>
          <li>
            When you&apos;re happy, ask it to build a new installer and run that over your current
            install. Your projects, walks, and settings carry over.
          </li>
        </ol>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => open.mutate()}
            disabled={open.isPending || !info.bundleAvailable}
            className="rounded-control bg-brand px-4 py-2 text-sm font-medium text-[#171200] transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {open.isPending ? 'Opening…' : 'Open source folder'}
          </button>
          <code className="min-w-0 truncate font-mono text-[11px] text-text-muted">{info.sourceFolder}</code>
        </div>
        {open.data && !open.data.success && (
          <p className="mt-2 text-xs text-danger">{open.data.error}</p>
        )}
        {!info.bundleAvailable && (
          <p className="mt-2 text-xs text-warning">
            This install didn&apos;t include the source bundle - reinstall from the latest installer.
          </p>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Prompt to paste into your AI coding tool
        </p>
        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-control border border-border-subtle bg-canvas p-3 font-mono text-[11px] text-text-primary">
          {info.aiPrompt}
        </pre>
        <div className="mt-2">
          <CopyButton text={info.aiPrompt} label="Copy prompt" />
        </div>
      </div>

      <p className="text-[11px] text-text-muted">
        Making changes needs Node.js on this computer (the prompt has the AI install it for you).
        Your data lives at <code className="font-mono">{info.dataFolder}</code>.
      </p>
    </div>
  )
}
