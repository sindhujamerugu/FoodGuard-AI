/**
 * ComplaintTimeline
 *
 * Renders the complete lifecycle of a complaint as a vertical timeline.
 *
 * Data sources (in priority order):
 *  1. complaint.status / timestamps — always available, forms the base steps
 *  2. useNotifications() — notification records with related_complaint matching
 *     this complaint's id. Event types ESCALATION_CREATED / ESCALATION_UPDATED /
 *     AI_ANALYSIS_COMPLETED / COMPLAINT_STATUS_CHANGED are inserted chronologically
 *     between the base steps.
 *
 * What we do NOT do:
 *  - Never show future / not-yet-reached steps as completed
 *  - Never fabricate escalation data
 *  - Never call GET /api/v1/escalations/ (REVIEWER-only endpoint)
 */
import {
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Sparkles,
  TrendingUp,
  UserCheck,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format'
import type { Complaint } from '@/types/complaint'
import type { NotificationEventType } from '@/types/notification'
import { useTranslation, type TranslationKey } from '@/i18n'
import { useNotifications } from '@/hooks/useNotifications'
import { useEscalationEvents } from '@/hooks/useOfficerAssignment'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABEL_KEYS: Record<string, TranslationKey> = {
  DRAFT:        'status.draft',
  SUBMITTED:    'status.submitted',
  UNDER_REVIEW: 'status.underReview',
  RESOLVED:     'status.resolved',
  CLOSED:       'status.closed',
  REJECTED:     'status.rejected',
}

const EVENT_META: Partial<Record<
  NotificationEventType,
  { label: TranslationKey; icon: React.ElementType; variant: TimelineVariant }
>> = {
  AI_ANALYSIS_COMPLETED:    { label: 'complaints.timeline.aiAssessment',    icon: Sparkles,    variant: 'info'    },
  COMPLAINT_STATUS_CHANGED: { label: 'status.underReview',                  icon: UserCheck,   variant: 'warning' },
  ESCALATION_CREATED:       { label: 'complaints.timeline.escalated',       icon: TrendingUp,  variant: 'warning' },
  ESCALATION_UPDATED:       { label: 'complaints.timeline.escalationUpdate', icon: TrendingUp,  variant: 'warning' },
}

type TimelineVariant = 'done' | 'active' | 'pending' | 'info' | 'warning' | 'resolved' | 'closed' | 'rejected'

interface TimelineStep {
  key: string
  label: string
  sublabel?: string   // e.g. notification message
  at: string | null
  variant: TimelineVariant
  icon: React.ElementType
}

function iconFor(variant: TimelineVariant): React.ElementType {
  switch (variant) {
    case 'done':     return CheckCircle2
    case 'active':   return Loader2
    case 'resolved': return CheckCircle2
    case 'closed':   return XCircle
    case 'rejected': return XCircle
    case 'info':     return Sparkles
    case 'warning':  return TrendingUp
    default:         return Clock
  }
}

const DOT_STYLES: Record<TimelineVariant, string> = {
  done:     'border-primary-500 bg-primary-500 text-white',
  active:   'border-warning-500 bg-warning-500 text-white',
  pending:  'border-neutral-200 bg-white text-neutral-300',
  info:     'border-info-400 bg-info-400 text-white',
  warning:  'border-warning-500 bg-warning-500 text-white',
  resolved: 'border-success-500 bg-success-500 text-white',
  closed:   'border-neutral-400 bg-neutral-400 text-white',
  rejected: 'border-danger-500 bg-danger-500 text-white',
}

const LINE_STYLES: Record<TimelineVariant, string> = {
  done:     'bg-primary-200',
  active:   'bg-warning-200',
  pending:  'bg-neutral-200',
  info:     'bg-info-200',
  warning:  'bg-warning-200',
  resolved: 'bg-success-200',
  closed:   'bg-neutral-200',
  rejected: 'bg-danger-200',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ComplaintTimeline({ complaint }: { complaint: Complaint }) {
  const { t, language } = useTranslation()
  const { data: notifications = [] } = useNotifications()
  const { data: escalationEvents = [] } = useEscalationEvents(complaint.id)

  // ── 1. Base status steps ───────────────────────────────────────────

  const isRejected = complaint.status === 'REJECTED'
  const isResolved = complaint.status === 'RESOLVED' || complaint.status === 'CLOSED'
  const isClosed   = complaint.status === 'CLOSED'
  const isReview   = complaint.status === 'UNDER_REVIEW' || isResolved || isRejected
  const isActive   = complaint.status === 'SUBMITTED'    // still waiting for first action

  const baseSteps: TimelineStep[] = [
    {
      key:     'SUBMITTED',
      label:   t('status.submitted'),
      at:      complaint.submitted_at,
      variant: 'done',
      icon:    FileText,
    },
    {
      key:     'UNDER_REVIEW',
      label:   t('status.underReview'),
      at:      isReview ? complaint.updated_at : null,
      variant: isReview ? 'done' : isActive ? 'active' : 'pending',
      icon:    UserCheck,
    },
  ]

  if (isRejected) {
    baseSteps.push({
      key:      'REJECTED',
      label:    t('status.rejected'),
      sublabel: complaint.rejection_reason || undefined,
      at:       complaint.rejected_at || complaint.updated_at,
      variant:  'rejected',
      icon:     XCircle,
    })
  } else {
    baseSteps.push({
      key:     'RESOLVED',
      label:   t('status.resolved'),
      at:      isResolved ? complaint.resolved_at : null,
      variant: isResolved ? 'resolved' : 'pending',
      icon:    CheckCircle2,
    })

    // Add CLOSED only if the complaint actually reached that state
    if (isClosed) {
      baseSteps.push({
        key:     'CLOSED',
        label:   t('status.closed'),
        at:      complaint.resolved_at,
        variant: 'closed',
        icon:    XCircle,
      })
    }
  }

  // ── 2. Notification-derived extra steps ────────────────────────────
  // Only events actually associated with THIS complaint are inserted.
  // Events are sorted chronologically and inserted between SUBMITTED
  // and UNDER_REVIEW (chronologically correct since they fire after submission).

  const notifSteps: TimelineStep[] = notifications
    .filter(n =>
      n.related_complaint === complaint.id &&
      n.event_type in EVENT_META,
    )
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(n => {
      const meta = EVENT_META[n.event_type]!
      return {
        key:      `notif-${n.id}`,
        label:    t(meta.label),
        sublabel: n.localized_message || n.message,
        at:       n.created_at,
        variant:  meta.variant,
        icon:     meta.icon,
      }
    })

  // ── 3. EscalationEvent steps from real food_safety_officers API ────
  //   Only events that actually exist in the backend — never fabricated.
  const apiEscalationSteps: TimelineStep[] = escalationEvents.map(ev => ({
    key:      `esc-${ev.id}`,
    label:    ev.from_level_name
      ? `Escalated: ${ev.from_level_name} → ${ev.to_level_name}`
      : `Assigned: ${ev.to_level_name}`,
    sublabel: ev.customer_message || undefined,
    at:       ev.created_at,
    variant:  (ev.from_level_name ? 'warning' : 'info') as TimelineVariant,
    icon:     TrendingUp,
  }))

  // ── 4. Merge chronologically — deduplicate by key ─────────────────
  const extraSteps: TimelineStep[] = [...notifSteps, ...apiEscalationSteps]
    .filter((step, i, arr) => arr.findIndex(s => s.key === step.key) === i)
    .sort((a, b) => {
      if (!a.at) return 1
      if (!b.at) return -1
      return new Date(a.at).getTime() - new Date(b.at).getTime()
    })

  // ── 5. Merge — extra steps go between first and second base steps ──
  const allSteps: TimelineStep[] = [
    baseSteps[0],
    ...extraSteps,
    ...baseSteps.slice(1),
  ]

  return (
    <ol className="space-y-0" aria-label="Complaint status timeline">
      {allSteps.map((step, i) => {
        const Icon       = step.icon ?? iconFor(step.variant)
        const isLast     = i === allSteps.length - 1
        const isPending  = step.variant === 'pending'
        const isSpinning = step.variant === 'active'

        return (
          <li key={step.key} className="flex gap-4">
            {/* Dot + connector */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300',
                  DOT_STYLES[step.variant],
                )}
              >
                <Icon
                  className={cn('size-3.5', isSpinning && 'animate-spin')}
                  aria-hidden="true"
                />
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'mt-1 w-0.5 flex-1 min-h-[24px] rounded-full transition-colors duration-500',
                    LINE_STYLES[step.variant],
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className={cn('pb-5 min-w-0 flex-1', isLast && 'pb-0')}>
              <p
                className={cn(
                  'text-sm font-semibold leading-tight transition-colors duration-300',
                  isPending ? 'text-neutral-400' : 'text-neutral-900',
                )}
              >
                {step.label}
              </p>

              {/* Notification message (sublabel) */}
              {step.sublabel && !isPending && (
                <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 line-clamp-2">
                  {step.sublabel}
                </p>
              )}

              {/* Timestamp */}
              {step.at && !isPending ? (
                <p className="mt-1 text-xs text-neutral-400">
                  {formatDateTime(step.at, language)}
                </p>
              ) : isPending ? (
                <p className="mt-1 text-xs text-neutral-300 italic">Not yet reached</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ── LinkedReportBadge — reused by ComplaintOverview ───────────────────────────

export function LinkedReportBadge({ title, status }: { title: string; status: string }) {
  const { t } = useTranslation()
  const key = STATUS_LABEL_KEYS[status]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600">
      <FileText className="size-3.5" aria-hidden="true" />
      {title} · {key ? t(key) : status.replace('_', ' ')}
    </span>
  )
}
