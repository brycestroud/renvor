import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { gsApi } from '../lib/gsApi'

export function Onboarding(): JSX.Element {
  const queryClient = useQueryClient()
  const [companyName, setCompanyName] = useState('')
  const [gsName, setGsName] = useState('')
  const [brandPrimaryColor, setBrandPrimaryColor] = useState('#FF8A24')
  const [brandAccentColor, setBrandAccentColor] = useState('#4EA1FF')

  const complete = useMutation({
    mutationFn: () =>
      gsApi().setSettings({
        companyName,
        gsName,
        brandPrimaryColor,
        brandAccentColor,
        onboardingComplete: true
      }),
    onSuccess: (next) => queryClient.setQueryData(['settings'], next)
  })

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-canvas">
      <div className="w-full max-w-md rounded-panel border border-border-subtle bg-surface-1 p-8">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          Renvor
        </p>
        <h1 className="mt-1 text-xl font-semibold text-text-primary">Set up this app</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Nothing here is hardcoded — every value is editable later in Settings.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Company name</span>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Construction"
              className="rounded-control border border-border bg-surface-2 px-3 py-2 text-text-primary outline-none focus:border-info"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-secondary">Your name (General Superintendent)</span>
            <input
              value={gsName}
              onChange={(e) => setGsName(e.target.value)}
              placeholder="Full name"
              className="rounded-control border border-border bg-surface-2 px-3 py-2 text-text-primary outline-none focus:border-info"
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

          <p className="text-xs text-text-muted">
            Report recipients, the checklist, and everything else configure in Settings after this.
          </p>

          <button
            onClick={() => complete.mutate()}
            disabled={complete.isPending || !companyName.trim() || !gsName.trim()}
            className="mt-2 rounded-control bg-brand px-4 py-2.5 text-sm font-medium text-[#171200] transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {complete.isPending ? 'Setting up…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
