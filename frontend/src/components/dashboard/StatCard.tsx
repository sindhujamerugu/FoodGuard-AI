import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  tone?: 'primary' | 'warning' | 'success' | 'danger' | 'neutral'
}

const toneStyles: Record<NonNullable<StatCardProps['tone']>, string> = {
  primary: 'bg-primary-50 text-primary-700',
  warning: 'bg-warning-50 text-warning-700',
  success: 'bg-success-50 text-success-700',
  danger: 'bg-danger-50 text-danger-700',
  neutral: 'bg-neutral-100 text-neutral-600',
}

export function StatCard({ label, value, icon: Icon, tone = 'primary' }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-neutral-100 bg-white p-5 shadow-card">
      <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', toneStyles[tone])}>
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-neutral-900">{value}</p>
        <p className="text-sm text-neutral-500">{label}</p>
      </div>
    </div>
  )
}
