import { cn } from '@/lib/cn'
import { useTranslation } from '@/i18n/LanguageContext'
import type { TranslationKey } from '@/i18n/en'
import type { ReportPriority } from '@/types/report'

const styles: Record<ReportPriority, string> = {
  LOW: 'bg-neutral-100 text-neutral-600',
  MEDIUM: 'bg-info-100 text-info-600',
  HIGH: 'bg-warning-100 text-warning-700',
  CRITICAL: 'bg-danger-100 text-danger-700',
}

const priorityKeys: Record<ReportPriority, TranslationKey> = {
  LOW: 'priority.low',
  MEDIUM: 'priority.medium',
  HIGH: 'priority.high',
  CRITICAL: 'priority.critical',
}

export function PriorityBadge({ priority, className }: { priority: ReportPriority; className?: string }) {
  const t = useTranslation()
  const key = priorityKeys[priority]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200',
        styles[priority],
        className,
      )}
    >
      {key ? t(key) : priority}
    </span>
  )
}

