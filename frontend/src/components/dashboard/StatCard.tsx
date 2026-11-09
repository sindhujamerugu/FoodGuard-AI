import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  tone?: 'primary' | 'warning' | 'success' | 'danger' | 'neutral'
  prominent?: boolean
}

const toneStyles: Record<NonNullable<StatCardProps['tone']>, string> = {
  primary: 'bg-primary-50 text-primary-700',
  warning: 'bg-warning-50 text-warning-700',
  success: 'bg-success-50 text-success-700',
  danger: 'bg-danger-50 text-danger-700',
  neutral: 'bg-neutral-100 text-neutral-600',
}

export function StatCard({ label, value, icon: Icon, tone = 'primary', prominent = false }: StatCardProps) {
  return (
    <div
      className={cn(
        'group relative flex items-center gap-4 overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        prominent
          ? 'border-primary-200 bg-gradient-to-br from-primary-50 to-white p-6'
          : 'border-neutral-200 bg-white p-4',
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-4 -top-4 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100',
          prominent ? 'size-24' : 'size-20',
          toneStyles[tone],
        )}
      />
      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:-translate-y-0.5',
          prominent ? 'size-12' : 'size-11',
          toneStyles[tone],
        )}
      >
        <Icon className={cn('aria-hidden="true"', prominent ? 'size-6' : 'size-5')} />
      </div>
      <div className="relative">
        <p
          className={cn(
            'font-semibold text-neutral-900',
            prominent ? 'text-3xl' : 'text-2xl',
          )}
        >
          {value}
        </p>
        <p className={cn('text-neutral-600', prominent ? 'mt-1 text-sm' : 'text-sm')}>{label}</p>
      </div>
    </div>
  )
}
