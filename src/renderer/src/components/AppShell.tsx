import { Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
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
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => gsApi().getSettings() })

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas text-text-primary">
      <Sidebar companyName={settings?.companyName ?? ''} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          pageLabel={pageLabels[location.pathname] ?? 'Renvor'}
          lastBackupAt={settings?.lastBackupAt ?? null}
        />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
