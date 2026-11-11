import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useTranslation } from '@/i18n/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { BRAND, getNavItems } from './navConfig'
import type { UserRole } from '@/types/user'

const STORAGE_KEY = 'foodguard.sidebar.collapsed'

interface SidebarProps {
  role: UserRole
  onCollapsedChange?: (collapsed: boolean) => void
}

export function Sidebar({ role, onCollapsedChange }: SidebarProps) {
  const items = getNavItems(role)
  const t = useTranslation()
  const { logout } = useAuth()

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  // Notify parent (AppShell) whenever collapsed state changes
  useEffect(() => {
    onCollapsedChange?.(collapsed)
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed))
    } catch {
      // private browsing — ignore
    }
  }, [collapsed, onCollapsedChange])

  function toggle() {
    setCollapsed((prev) => !prev)
  }

  async function handleLogout() {
    await logout()
    window.location.replace('/login')
  }

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col shrink-0 border-r border-neutral-200/80 bg-white/95 backdrop-blur-sm',
        'transition-[width] duration-300 ease-in-out overflow-hidden',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
      aria-label="Primary navigation"
    >
      {/* ── Brand ── */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-neutral-200/80 px-4 shrink-0',
          collapsed ? 'justify-center' : 'gap-2.5 justify-between',
        )}
      >
        <div className={cn('flex items-center gap-2.5 min-w-0', collapsed && 'justify-center')}>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 shadow-sm">
            <BRAND.icon className="size-4.5 text-white" aria-hidden="true" />
          </div>
          {!collapsed && (
            <span className="truncate text-base font-semibold text-primary-900">{BRAND.name}</span>
          )}
        </div>
        {!collapsed && (
          <button
            type="button"
            onClick={toggle}
            title={t('sidebar.collapse')}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
            aria-label={t('sidebar.collapse')}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ── Nav items ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 space-y-0.5" aria-label="Customer navigation">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={collapsed ? t(item.labelKey) : undefined}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center rounded-xl transition-all duration-200',
                collapsed ? 'justify-center px-0 py-2.5 mx-1' : 'gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-neutral-600 hover:bg-primary-50 hover:text-primary-700',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    'shrink-0 transition-transform duration-200',
                    collapsed ? 'size-5' : 'size-4.5',
                    !isActive && 'group-hover:scale-110',
                  )}
                  aria-hidden="true"
                />
                {!collapsed && (
                  <span className="truncate text-sm font-medium">{t(item.labelKey)}</span>
                )}
                {/* Tooltip on collapsed */}
                {collapsed && (
                  <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                    {t(item.labelKey)}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Bottom: collapse toggle (collapsed state) + logout ── */}
      <div className={cn('border-t border-neutral-200/80 px-2 py-3 space-y-0.5 shrink-0')}>
        {/* Expand button shown only when collapsed */}
        {collapsed && (
          <button
            type="button"
            onClick={toggle}
            title={t('sidebar.expand')}
            aria-label={t('sidebar.expand')}
            className="group relative flex w-full items-center justify-center rounded-xl px-0 py-2.5 mx-1 text-neutral-500 transition-all duration-200 hover:bg-primary-50 hover:text-primary-700"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
            <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
              {t('sidebar.expand')}
            </span>
          </button>
        )}
        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? t('common.logOut') : undefined}
          aria-label={t('common.logOut')}
          className={cn(
            'group relative flex w-full items-center rounded-xl text-neutral-500 transition-all duration-200 hover:bg-danger-50 hover:text-danger-600',
            collapsed ? 'justify-center px-0 py-2.5 mx-1' : 'gap-3 px-3 py-2.5',
          )}
        >
          <LogOut className="size-4.5 shrink-0" aria-hidden="true" />
          {!collapsed && (
            <span className="truncate text-sm font-medium">{t('common.logOut')}</span>
          )}
          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
              {t('common.logOut')}
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}
