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
    <div className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-neutral-100 bg-white p-5 shadow-card transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div
        className={cn(
          'pointer-events-none absolute -right-4 -top-4 size-20 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100',
          toneStyles[tone],
        )}
      />
      <div
        className={cn(
          'relative flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:-translate-y-0.5',
          toneStyles[tone],
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="relative">
        <p className="text-2xl font-semibold text-neutral-900">{value}</p>
        <p className="text-sm text-neutral-500">{label}</p>
      </div>
    </div>
  )
}
