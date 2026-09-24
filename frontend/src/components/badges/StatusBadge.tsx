import { cn } from '@/lib/cn'
import type { ComplaintStatus } from '@/types/complaint'
import type { ReportStatus } from '@/types/report'

type Status = ReportStatus | ComplaintStatus

const styles: Record<Status, string> = {
  DRAFT: 'bg-neutral-100 text-neutral-600',
  SUBMITTED: 'bg-info-100 text-info-600',
  UNDER_REVIEW: 'bg-warning-100 text-warning-700',
  RESOLVED: 'bg-success-100 text-success-700',
  CLOSED: 'bg-neutral-200 text-neutral-500',
}

const labels: Record<Status, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles[status],
        className,
      )}
    >
      {labels[status]}
    </span>
  )
}
