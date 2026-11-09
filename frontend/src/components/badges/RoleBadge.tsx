import { cn } from '@/lib/cn'
import { useTranslation } from '@/i18n/LanguageContext'
import type { TranslationKey } from '@/i18n/en'
import type { UserRole } from '@/types/user'

const styles: Record<UserRole, string> = {
  CUSTOMER: 'bg-primary-100 text-primary-800',
  RESTAURANT_USER: 'bg-info-100 text-info-600',
  REVIEWER: 'bg-warning-100 text-warning-700',
  ADMIN: 'bg-neutral-800 text-white',
}

const roleKeys: Record<UserRole, TranslationKey> = {
  CUSTOMER: 'role.customer',
  RESTAURANT_USER: 'role.restaurant',
  REVIEWER: 'role.reviewer',
  ADMIN: 'role.admin',
}

export function RoleBadge({ role, className }: { role: UserRole; className?: string }) {
  const t = useTranslation()
  const key = roleKeys[role]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200',
        styles[role],
        className,
      )}
    >
      {key ? t(key) : role}
    </span>
  )
}

