import { cn } from '@/lib/cn'
import type { ReportPriority } from '@/types/report'

const styles: Record<ReportPriority, string> = {
  LOW: 'bg-neutral-100 text-neutral-600',
  MEDIUM: 'bg-info-100 text-info-600',
  HIGH: 'bg-warning-100 text-warning-700',
  CRITICAL: 'bg-danger-100 text-danger-700',
}

export function PriorityBadge({ priority, className }: { priority: ReportPriority; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        styles[priority],
        className,
      )}
    >
      {priority.toLowerCase()}
    </span>
  )
}
