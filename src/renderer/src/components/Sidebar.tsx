import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardCheck,
  ListChecks,
  FileText,
  HardHat,
  Building2,
  Plug,
  Settings as SettingsIcon
} from 'lucide-react'
import clsx from 'clsx'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  comingSoon?: boolean
}

const primaryNav: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/job-walk', label: 'Job Walk', icon: ClipboardCheck },
  { to: '/action-items', label: 'Action Items', icon: ListChecks },
  { to: '/reports', label: 'Reports', icon: FileText }
]

const managementNav: NavItem[] = [
  { to: '/superintendents', label: 'Superintendents', icon: HardHat },
  { to: '/projects', label: 'Projects', icon: Building2 }
]

const bottomNav: NavItem[] = [
  { to: '/procore', label: 'Procore', icon: Plug, comingSoon: true },
  { to: '/settings', label: 'Settings', icon: SettingsIcon }
]

function NavRow({ item }: { item: NavItem }): JSX.Element {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        clsx(
          'group relative flex items-center gap-2.5 rounded-control px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-surface-2 text-text-primary'
            : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={clsx(
              'absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-brand transition-opacity',
              isActive ? 'opacity-100' : 'opacity-0'
            )}
          />
          <Icon size={18} strokeWidth={1.75} className={isActive ? 'text-brand' : ''} />
          <span className="flex-1">{item.label}</span>
          {item.comingSoon && (
            <span className="text-[10px] uppercase tracking-wide text-text-disabled">Soon</span>
          )}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar({ companyName }: { companyName: string }): JSX.Element {
  return (
    <aside className="flex h-full w-[228px] shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex flex-col gap-0.5 border-b border-border-subtle px-4 py-4">
        <span className="truncate text-sm font-semibold text-text-primary">
          {companyName || 'Company Name'}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          Renvor
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-4 px-3 py-4">
        <div className="flex flex-col gap-1">
          {primaryNav.map((item) => (
            <NavRow key={item.to} item={item} />
          ))}
        </div>

        <div className="border-t border-border-subtle pt-3">
          <div className="flex flex-col gap-1">
            {managementNav.map((item) => (
              <NavRow key={item.to} item={item} />
            ))}
          </div>
        </div>
      </nav>

      <div className="flex flex-col gap-1 border-t border-border-subtle px-3 py-3">
        {bottomNav.map((item) => (
          <NavRow key={item.to} item={item} />
        ))}
      </div>
    </aside>
  )
}
