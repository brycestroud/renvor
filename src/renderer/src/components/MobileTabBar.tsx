import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ClipboardCheck, ListChecks, FileText, Menu } from 'lucide-react'
import clsx from 'clsx'

const tabs = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/job-walk', label: 'Walk', icon: ClipboardCheck },
  { to: '/action-items', label: 'Actions', icon: ListChecks },
  { to: '/reports', label: 'Reports', icon: FileText }
]

/** Phone-only bottom navigation; the desktop sidebar takes over at md and up. */
export function MobileTabBar({ onMore }: { onMore: () => void }): JSX.Element {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-sidebar md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            clsx(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]',
              isActive ? 'text-brand' : 'text-text-muted'
            )
          }
        >
          <Icon size={20} strokeWidth={1.75} />
          {label}
        </NavLink>
      ))}
      <button
        onClick={onMore}
        className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-text-muted"
      >
        <Menu size={20} strokeWidth={1.75} />
        More
      </button>
    </nav>
  )
}
