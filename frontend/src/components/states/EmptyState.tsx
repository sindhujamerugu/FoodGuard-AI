import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Reveal } from '@/components/motion/Reveal'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Reveal variant="fade">
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-14 text-center',
          className,
        )}
      >
        {icon && (
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary-50 text-primary-600 animate-float">
            {icon}
          </div>
        )}
        <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
        {description && <p className="mt-1.5 max-w-sm text-sm text-neutral-500">{description}</p>}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </Reveal>
  )
}
