import { cn } from '@/lib/cn'
import type { UserRole } from '@/types/user'

const styles: Record<UserRole, string> = {
  CUSTOMER: 'bg-primary-100 text-primary-800',
  RESTAURANT_USER: 'bg-info-100 text-info-600',
  REVIEWER: 'bg-warning-100 text-warning-700',
  ADMIN: 'bg-neutral-800 text-white',
}

const labels: Record<UserRole, string> = {
  CUSTOMER: 'Customer',
  RESTAURANT_USER: 'Restaurant',
  REVIEWER: 'Reviewer',
  ADMIN: 'Admin',
}

export function RoleBadge({ role, className }: { role: UserRole; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles[role],
        className,
      )}
    >
      {labels[role]}
    </span>
  )
}
