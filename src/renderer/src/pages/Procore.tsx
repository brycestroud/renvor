import { Plug } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { gsApi } from '../lib/gsApi'
import type { AppSettings } from '@shared/ipc-contract'

export function Procore(): JSX.Element {
  const queryClient = useQueryClient()
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => gsApi().getSettings() })

  const save = useMutation({
    mutationFn: (patch: Partial<AppSettings>) => gsApi().setSettings(patch),
    onSuccess: (next) => queryClient.setQueryData(['settings'], next)
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Procore" />
      <EmptyState
        icon={Plug}
        title="Procore integration — coming soon"
        description="Daily logs, observations and inspections will surface here once connected. No real Procore connection exists yet - this is a placeholder per the build spec (Phase 9)."
        action={
          <button
            disabled
            className="cursor-not-allowed rounded-control border border-border-strong bg-surface-2 px-4 py-2 text-sm text-text-disabled"
          >
            Connect
          </button>
        }
      />

      <div className="max-w-2xl rounded-panel border border-border-subtle bg-surface-1 p-6">
        <h2 className="text-sm font-semibold text-text-primary">Preview with mock data</h2>
        <p className="mt-1 text-xs text-text-muted">
          This turns on the Procore-shaped UI elsewhere in the app (a &quot;Procore this week&quot;
          panel on Job Walk, and &quot;Import from Procore&quot; on Action Items) using realistic
          fake data instead of a real connection - so the layout can be reviewed and tested before
          the real integration exists. It does not talk to the real Procore API and does not
          require any credentials. Project/superintendent Procore ID fields also appear on their
          edit forms while this is on, for when the real integration is ready to use them.
        </p>
        <div className="mt-4 flex gap-2">
          {(
            [
              { value: false, label: 'Off' },
              { value: true, label: 'On (mock data)' }
            ] as const
          ).map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => save.mutate({ procoreEnabled: opt.value })}
              disabled={save.isPending}
              className={`rounded-control border px-4 py-2 text-sm transition-colors disabled:opacity-60 ${
                (settings?.procoreEnabled ?? false) === opt.value
                  ? 'border-brand-border bg-brand-muted text-brand'
                  : 'border-border bg-surface-2 text-text-secondary hover:bg-surface-hover'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
