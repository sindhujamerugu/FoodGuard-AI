import { CheckCircle2, Circle, FileText } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format'
import type { Complaint } from '@/types/complaint'
import { useTranslation, type TranslationKey } from '@/i18n'

const STATUS_KEYS: Record<string, TranslationKey> = {
  DRAFT: 'status.draft',
  SUBMITTED: 'status.submitted',
  UNDER_REVIEW: 'status.underReview',
  RESOLVED: 'status.resolved',
  CLOSED: 'status.closed',
}

export function ComplaintTimeline({ complaint }: { complaint: Complaint }) {
  const { t, language } = useTranslation()

  const steps = [
    { key: 'SUBMITTED', label: t('status.submitted'), at: complaint.submitted_at, done: true },
    {
      key: 'UNDER_REVIEW',
      label: t('status.underReview'),
      at: complaint.status === 'UNDER_REVIEW' || complaint.status === 'RESOLVED' || complaint.status === 'CLOSED' ? complaint.updated_at : null,
      done: complaint.status !== 'SUBMITTED',
    },
    {
      key: 'RESOLVED',
      label: t('status.resolved'),
      at: complaint.status === 'RESOLVED' || complaint.status === 'CLOSED' ? complaint.resolved_at : null,
      done: complaint.status === 'RESOLVED' || complaint.status === 'CLOSED',
    },
    {
      key: 'CLOSED',
      label: t('status.closed'),
      at: complaint.status === 'CLOSED' ? complaint.resolved_at : null,
      done: complaint.status === 'CLOSED',
    },
  ]

  return (
    <ol className="space-y-4">
      {steps.map((step, i) => (
        <li key={step.key} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            {step.done ? (
              <CheckCircle2 className="size-5 text-primary-600" aria-hidden="true" />
            ) : (
              <Circle className="size-5 text-neutral-300" aria-hidden="true" />
            )}
            {i < steps.length - 1 && (
              <div className={cn('mt-1 h-6 w-px transition-colors duration-500', step.done ? 'bg-primary-200' : 'bg-neutral-200')} />
            )}
          </div>
          <div className="pb-1">
            <p className={cn('text-sm font-medium transition-colors duration-300', step.done ? 'text-neutral-900' : 'text-neutral-400')}>{step.label}</p>
            {step.at && <p className="text-xs text-neutral-400">{formatDateTime(step.at, language)}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export function LinkedReportBadge({ title, status }: { title: string; status: string }) {
  const { t } = useTranslation()
  const statusLabel = STATUS_KEYS[status] ? t(STATUS_KEYS[status]) : status.replace('_', ' ')

  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600">
      <FileText className="size-3.5" aria-hidden="true" />
      {title} · {statusLabel}
    </span>
  )
}
