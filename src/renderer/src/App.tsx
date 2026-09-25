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

export function App(): JSX.Element | null {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => gsApi().getSettings()
  })

  useAppliedTheme(settings?.theme)

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
      </Routes>
    </HashRouter>
  )
}
