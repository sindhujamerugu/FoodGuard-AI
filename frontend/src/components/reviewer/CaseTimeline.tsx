import { CheckCircle2, Circle, Clock, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format'
import { useLanguage } from '@/i18n/LanguageContext'

export interface CaseTimelineEvent {
  key: string
  label: string
  description?: string
  timestamp: string | null
  status: 'completed' | 'current' | 'pending'
  tone?: 'default' | 'warning' | 'danger' | 'success'
}

interface CaseTimelineProps {
  submittedAt: string
  underReviewAt?: string | null
  escalatedAt?: string | null
  escalationLevel?: string | null
  resolvedAt?: string | null
  closedAt?: string | null
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED'
  className?: string
}

export function CaseTimeline({
  submittedAt,
  underReviewAt,
  escalatedAt,
  escalationLevel,
  resolvedAt,
  closedAt,
  status,
  className,
}: CaseTimelineProps) {
  const { language } = useLanguage()
  const isDraft = status === 'DRAFT'
  const isUnderReview = status === 'UNDER_REVIEW'
  const isResolved = status === 'RESOLVED'
  const isClosed = status === 'CLOSED'

  const events: CaseTimelineEvent[] = []

  // 1. Submitted
  events.push({
    key: 'submitted',
    label: isDraft ? 'Draft Created' : 'Case Submitted',
    description: isDraft ? 'Saved by customer as draft' : 'Formally submitted for investigation',
    timestamp: submittedAt,
    status: isDraft ? 'current' : 'completed',
    tone: 'default',
  })

  // 2. Under Review
  if (isUnderReview || isResolved || isClosed || underReviewAt) {
    events.push({
      key: 'under_review',
      label: 'Under Review',
      description: 'Reviewer accepted case for active investigation',
      timestamp: underReviewAt || (isUnderReview ? submittedAt : null),
      status: isUnderReview ? 'current' : isResolved || isClosed ? 'completed' : 'pending',
      tone: 'warning',
    })
  } else {
    events.push({
      key: 'under_review',
      label: 'Under Review',
      description: 'Awaiting reviewer investigation',
      timestamp: null,
      status: 'pending',
      tone: 'default',
    })
  }

  // 3. Escalated (ONLY shown if real escalation data exists)
  if (escalatedAt) {
    events.push({
      key: 'escalated',
      label: 'Escalated to Senior Tier',
      description: escalationLevel ? `Review tier: ${escalationLevel.replace('_', ' ')}` : 'Escalation triggered',
      timestamp: escalatedAt ?? null,
      status: 'completed',
      tone: 'danger',
    })
  }

  // 4. Resolved
  if (isResolved || isClosed || resolvedAt) {
    events.push({
      key: 'resolved',
      label: 'Case Resolved',
      description: 'Finding documented and resolution concluded',
      timestamp: resolvedAt ?? null,
      status: isResolved ? 'current' : isClosed ? 'completed' : 'pending',
      tone: 'success',
    })
  } else {
    events.push({
      key: 'resolved',
      label: 'Resolution',
      description: 'Final evaluation & corrective action',
      timestamp: null,
      status: 'pending',
      tone: 'default',
    })
  }

  // 5. Closed
  if (isClosed || closedAt) {
    events.push({
      key: 'closed',
      label: 'Case Closed',
      description: 'Audit cycle completed, record locked',
      timestamp: closedAt ?? resolvedAt ?? null,
      status: 'completed',
      tone: 'default',
    })
  }

  return (
    <div className={cn('relative', className)}>
      <ol className="space-y-4">
        {events.map((evt, idx) => {
          const isLast = idx === events.length - 1

          return (
            <li key={evt.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                {evt.key === 'escalated' ? (
                  <div className="flex size-5 items-center justify-center rounded-full bg-danger-100 text-danger-700">
                    <ShieldAlert className="size-3.5" aria-hidden="true" />
                  </div>
                ) : evt.status === 'completed' ? (
                  <CheckCircle2 className="size-5 text-primary-700" aria-hidden="true" />
                ) : evt.status === 'current' ? (
                  <div className="flex size-5 items-center justify-center rounded-full border-2 border-primary-600 bg-white">
                    <span className="size-2 rounded-full bg-primary-600" />
                  </div>
                ) : (
                  <Circle className="size-5 text-neutral-300" aria-hidden="true" />
                )}

                {!isLast && (
                  <div
                    className={cn(
                      'mt-1 h-7 w-px',
                      evt.status === 'completed' ? 'bg-primary-300' : 'bg-neutral-200',
                    )}
                  />
                )}
              </div>

              <div className="pb-1 text-left min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      'text-xs font-semibold uppercase tracking-wider',
                      evt.status === 'completed'
                        ? 'text-neutral-900'
                        : evt.status === 'current'
                          ? 'text-primary-800'
                          : 'text-neutral-400',
                    )}
                  >
                    {evt.label}
                  </p>
                  {evt.status === 'current' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-700">
                      <Clock className="size-2.5 animate-spin" style={{ animationDuration: '4s' }} /> Active
                    </span>
                  )}
                </div>

                {evt.description && (
                  <p className="mt-0.5 text-xs text-neutral-500 leading-snug">{evt.description}</p>
                )}

                {evt.timestamp && (
                  <p className="mt-1 text-[11px] font-mono text-neutral-400">
                    {formatDateTime(evt.timestamp, language)}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
