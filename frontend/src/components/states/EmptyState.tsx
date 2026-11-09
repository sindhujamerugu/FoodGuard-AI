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
          'flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-gradient-to-br from-neutral-50 to-white px-8 py-16 text-center',
          className,
        )}
      >
        {icon && (
          <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold text-primary-900">{title}</h3>
        {description && <p className="mt-2 max-w-md text-base text-primary-700 leading-relaxed">{description}</p>}
        {action && <div className="mt-6">{action}</div>}
      </div>
    </Reveal>
  )
}
