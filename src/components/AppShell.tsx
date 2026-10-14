import { Box, History, Home, Settings } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n'
import type { ReactNode } from 'react'
import SidebarSupportInfo from './SidebarSupportInfo'

function SidebarItem({
  to,
  label,
  icon,
  active,
}: {
  to: string
  label: string
  icon: ReactNode
  active: boolean
}) {
  return (
    <Link
      to={to}
      className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
        active
          ? 'bg-[var(--accent)] text-[var(--app-text)] shadow-lg shadow-[rgba(var(--accent-rgb),0.2)]'
          : 'text-[var(--app-muted)] hover:bg-white/5 hover:text-[var(--app-text)]'
      }`}
    >
      <span
        className={`transition ${
          active ? 'text-[var(--app-text)]' : 'text-[var(--app-muted)] group-hover:text-[var(--app-text)]'
        }`}
      >
        {icon}
      </span>
      {label}
    </Link>
  )
}

export default function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { t } = useI18n()

  return (
    <div
      className="app-layout flex min-h-screen items-stretch bg-[var(--app-bg)] text-[var(--app-text)]"
      style={{ backgroundColor: 'var(--app-bg)', color: 'var(--app-text)' }}
    >
      <aside
        className="app-sidebar sticky top-0 flex h-screen min-h-0 w-[290px] shrink-0 self-start flex-col border-r px-6 py-8"
        style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--panel-border)' }}
      >
        <div className="pointer-events-none absolute left-0 top-0 h-60 w-60 rounded-full bg-[rgba(var(--accent-rgb),0.12)] blur-3xl" />

        <div className="relative mb-10 flex items-center gap-4">
          <Box size={28} className="text-[var(--accent)]" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--app-text)]">Food Business Manager</h1>
            <p className="mt-0.5 text-xs text-[var(--app-muted)]">{t('app.panel')}</p>
          </div>
        </div>

        <nav className="app-sidebar-nav relative flex flex-col gap-2">
          <SidebarItem
            to="/"
            label={t('nav.home')}
            icon={<Home size={18} />}
            active={location.pathname === '/'}
          />
          <SidebarItem
            to="/products"
            label={t('nav.products')}
            icon={<Box size={18} />}
            active={location.pathname === '/products'}
          />
          <SidebarItem
            to="/history"
            label={t('nav.history')}
            icon={<History size={18} />}
            active={location.pathname === '/history'}
          />
          <SidebarItem
            to="/settings"
            label={t('nav.settings')}
            icon={<Settings size={18} />}
            active={location.pathname === '/settings'}
          />
        </nav>

        <SidebarSupportInfo />
      </aside>

      <main className="app-main min-h-screen min-w-0 flex-1 bg-[var(--app-bg)]">{children}</main>
    </div>
  )
}
