import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useTranslation } from '@/i18n/LanguageContext'
import { BRAND, getNavItems } from './navConfig'
import type { UserRole } from '@/types/user'

export function Sidebar({ role }: { role: UserRole }) {
  const items = getNavItems(role)
  const t = useTranslation()

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-neutral-200 bg-white lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-neutral-200 px-6">
        <BRAND.icon className="size-6 text-primary-600" aria-hidden="true" />
        <span className="text-base font-semibold text-primary-900">{BRAND.name}</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-6" aria-label="Primary">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary-100 text-primary-800 shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
              )
            }
          >
            <item.icon
              className="size-4.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
