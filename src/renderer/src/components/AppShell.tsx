import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MobileTabBar } from './MobileTabBar'
import { gsApi } from '../lib/gsApi'

const pageLabels: Record<string, string> = {
  '/': 'Dashboard / Overview',
  '/job-walk': 'Job Walk',
  '/action-items': 'Action Items',
  '/reports': 'Reports',
  '/superintendents': 'Superintendents',
  '/projects': 'Projects',
  '/procore': 'Procore',
  '/settings': 'Settings'
}

export function AppShell(): JSX.Element {
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => gsApi().getSettings() })

  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setDrawerOpen(false)
    mainRef.current?.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-canvas text-text-primary">
      <div className="hidden h-full md:flex">
        <Sidebar companyName={settings?.companyName ?? ''} />
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative h-full w-[260px] max-w-[80vw]" onClick={(e) => e.stopPropagation()}>
            <Sidebar companyName={settings?.companyName ?? ''} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          pageLabel={pageLabels[location.pathname] ?? 'Renvor'}
          companyName={settings?.companyName ?? ''}
          lastBackupAt={settings?.lastBackupAt ?? null}
        />
        <main ref={mainRef} className="flex-1 overflow-y-auto px-3 py-4 pb-24 md:px-6 md:py-6 md:pb-6">
          <Outlet />
        </main>
      </div>

      <MobileTabBar onMore={() => setDrawerOpen(true)} />
    </div>
  )
}
