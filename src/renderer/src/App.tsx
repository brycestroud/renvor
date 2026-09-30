import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { gsApi } from './lib/gsApi'
import { AppShell } from './components/AppShell'
import { Onboarding } from './pages/Onboarding'
import { Dashboard } from './pages/Dashboard'
import { JobWalk } from './pages/JobWalk'
import { ActionItems } from './pages/ActionItems'
import { Reports } from './pages/Reports'
import { Superintendents } from './pages/Superintendents'
import { SuperintendentDetail } from './pages/SuperintendentDetail'
import { Projects } from './pages/Projects'
import { Procore } from './pages/Procore'
import { Settings } from './pages/Settings'
import { PrintWalk } from './pages/print/PrintWalk'
import { PrintReport } from './pages/print/PrintReport'

function useAppliedTheme(theme: 'light' | 'dark' | 'system' | undefined): void {
  useEffect(() => {
    if (!theme) return
    const root = document.documentElement
    if (theme === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)')
      const apply = () => root.setAttribute('data-theme', mql.matches ? 'dark' : 'light')
      apply()
      mql.addEventListener('change', apply)
      return () => mql.removeEventListener('change', apply)
    }
    root.setAttribute('data-theme', theme)
  }, [theme])
}

/**
 * Settings > Company's "Primary color" / "Accent color" pickers saved to
 * the DB but nothing ever read them back - inline styles on <html> beat
 * tokens.css's :root[data-theme] rules, so this overrides the --brand/
 * --info base values the rest of the theme (hover/pressed/muted/border,
 * all color-mix()'d off these two) derives from.
 */
function useAppliedBrandColors(primary: string | undefined, accent: string | undefined): void {
  useEffect(() => {
    const root = document.documentElement
    if (primary) root.style.setProperty('--brand', primary)
    if (accent) root.style.setProperty('--info', accent)
  }, [primary, accent])
}

export function App(): JSX.Element | null {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => gsApi().getSettings()
  })

  useAppliedTheme(settings?.theme)
  useAppliedBrandColors(settings?.brandPrimaryColor, settings?.brandAccentColor)

  if (isLoading) return null

  if (!settings?.onboardingComplete) {
    return <Onboarding />
  }

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/job-walk" element={<JobWalk />} />
          <Route path="/action-items" element={<ActionItems />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/superintendents" element={<Superintendents />} />
          <Route path="/superintendents/:id" element={<SuperintendentDetail />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/procore" element={<Procore />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="/print/walk/:id" element={<PrintWalk />} />
        <Route path="/print/report/:type/:weekStart" element={<PrintReport />} />
      </Routes>
    </HashRouter>
  )
}
