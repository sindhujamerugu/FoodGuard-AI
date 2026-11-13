import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Dropdown } from '@/components/ui/Dropdown'
import { RoleBadge } from '@/components/badges/RoleBadge'
import { initials } from '@/lib/format'
import { LanguageSelector } from './LanguageSelector'
import { useTranslation } from '@/i18n/LanguageContext'
import { cn } from '@/lib/cn'

// Lazy import to avoid circular deps — notifications hook loaded only when component mounts.
// We use a simple inline query to get unread count without importing the full hook file.
import { useQuery } from '@tanstack/react-query'
import { http } from '@/lib/http'
import type { Notification } from '@/types/notification'

function useUnreadCount() {
  const { isAuthenticated } = useAuth()
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => http.get<Notification[]>('/notifications/').then((r) => r.data),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  })
  return data ? data.filter((n) => !n.is_read).length : 0
}

export function Topbar({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const t = useTranslation()
  const unreadCount = useUnreadCount()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true, state: null })
  }

  if (!user) return null

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200/80 bg-white/95 px-4 backdrop-blur-sm sm:px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors lg:hidden"
          aria-label={t('topbar.openMenu')}
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <h1 className="text-base font-semibold text-primary-900 sm:text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-1">
        <LanguageSelector />

        {/* Notification bell — routes according to user role */}
        <button
          type="button"
          onClick={() => {
            if (user.role === 'REVIEWER' || user.role === 'ADMIN') {
              navigate('/reviewer/notifications')
            } else {
              navigate('/notifications')
            }
          }}
          aria-label={
            unreadCount > 0
              ? t('topbar.unreadCount', { count: unreadCount })
              : t('topbar.notifications')
          }
          className="relative flex size-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        >
          <Bell className="size-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white',
                'animate-reveal-fade',
              )}
              aria-hidden="true"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <Dropdown
          align="right"
          trigger={
            <span className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-neutral-50 transition-colors cursor-pointer">
              <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-xs font-semibold text-white shadow-sm">
                {initials(user.first_name, user.last_name)}
              </span>
              <span className="hidden flex-col items-start sm:flex">
                <span className="text-sm font-medium leading-tight text-neutral-900">
                  {user.first_name} {user.last_name}
                </span>
                <RoleBadge role={user.role} className="mt-0.5" />
              </span>
            </span>
          }
          items={[
            {
              label: t('nav.profile'),
              icon: <UserIcon className="size-4" />,
              onSelect: () => navigate('/profile'),
            },
            {
              label: t('common.logOut'),
              icon: <LogOut className="size-4" />,
              danger: true,
              onSelect: handleLogout,
            },
          ]}
        />
      </div>
    </header>
  )
}
