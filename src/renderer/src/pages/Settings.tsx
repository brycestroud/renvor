import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../components/PageHeader'
import { gsApi } from '../lib/gsApi'
import type { AppSettings } from '@shared/ipc-contract'

type Group = 'company' | 'people' | 'checklist' | 'ai' | 'notifications' | 'backup' | 'appearance'

const groups: Array<{ key: Group; label: string; ready: boolean }> = [
  { key: 'company', label: 'Company', ready: true },
  { key: 'people', label: 'People', ready: false },
  { key: 'checklist', label: 'Checklist', ready: false },
  { key: 'ai', label: 'AI', ready: false },
  { key: 'notifications', label: 'Notifications', ready: false },
  { key: 'backup', label: 'Backup & Data', ready: false },
  { key: 'appearance', label: 'Appearance', ready: true }
]

export function Settings(): JSX.Element {
  const [active, setActive] = useState<Group>('company')
  const queryClient = useQueryClient()
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => gsApi().getSettings() })
  const [companyName, setCompanyName] = useState('')
  const [brandPrimaryColor, setBrandPrimaryColor] = useState('#FF8A24')
  const [brandAccentColor, setBrandAccentColor] = useState('#4EA1FF')

  useEffect(() => {
    if (!settings) return
    setCompanyName(settings.companyName)
    setBrandPrimaryColor(settings.brandPrimaryColor)
    setBrandAccentColor(settings.brandAccentColor)
  }, [settings])

  const save = useMutation({
    mutationFn: (patch: Partial<AppSettings>) => gsApi().setSettings(patch),
    onSuccess: (next) => queryClient.setQueryData(['settings'], next)
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" />
      <div className="flex gap-6">
        <div className="flex w-[200px] shrink-0 flex-col gap-1">
          {groups.map((g) => (
            <button
              key={g.key}
              onClick={() => setActive(g.key)}
              className={`flex items-center justify-between rounded-control px-3 py-2 text-left text-sm transition-colors ${
                active === g.key
                  ? 'bg-surface-2 text-text-primary'
                  : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              {g.label}
              {!g.ready && <span className="text-[10px] uppercase text-text-disabled">Soon</span>}
            </button>
          ))}
        </div>

        <div className="flex-1 rounded-panel border border-border-subtle bg-surface-1 p-6">
          {active === 'company' && (
            <div className="flex max-w-md flex-col gap-4">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Company</h2>
                <p className="mt-1 text-xs text-text-muted">
                  Used across the app, PDF reports and AI prompts. No company name is hardcoded.
                </p>
              </div>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-text-secondary">Company name</span>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="rounded-control border border-border bg-surface-2 px-3 py-2 text-text-primary outline-none focus:border-info"
                  placeholder="Acme Construction"
                />
              </label>
              <div className="flex gap-4">
                <label className="flex flex-1 flex-col gap-1.5 text-sm">
                  <span className="text-text-secondary">Primary color</span>
                  <input
                    type="color"
                    value={brandPrimaryColor}
                    onChange={(e) => setBrandPrimaryColor(e.target.value)}
                    className="h-9 w-full cursor-pointer rounded-control border border-border bg-surface-2"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1.5 text-sm">
                  <span className="text-text-secondary">Accent color</span>
                  <input
                    type="color"
                    value={brandAccentColor}
                    onChange={(e) => setBrandAccentColor(e.target.value)}
                    className="h-9 w-full cursor-pointer rounded-control border border-border bg-surface-2"
                  />
                </label>
              </div>
              <button
                onClick={() =>
                  save.mutate({ companyName, brandPrimaryColor, brandAccentColor })
                }
                disabled={save.isPending}
                className="w-fit rounded-control bg-brand px-4 py-2 text-sm font-medium text-[#171200] transition-colors hover:bg-brand-hover disabled:opacity-60"
              >
                {save.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}

          {active === 'appearance' && (
            <div className="flex max-w-md flex-col gap-4">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Appearance</h2>
                <p className="mt-1 text-xs text-text-muted">Light, dark, or follow the system.</p>
              </div>
              <div className="flex gap-2">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => save.mutate({ theme: t })}
                    className={`rounded-control border px-4 py-2 text-sm capitalize transition-colors ${
                      settings?.theme === t
                        ? 'border-brand-border bg-brand-muted text-brand'
                        : 'border-border bg-surface-2 text-text-secondary hover:bg-surface-hover'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {active !== 'company' && active !== 'appearance' && (
            <p className="text-sm text-text-muted">This settings group ships in a later phase.</p>
          )}
        </div>
      </div>
    </div>
  )
}
