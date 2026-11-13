/**
 * OfficerWorkflowSeam
 *
 * Shows the customer-visible officer assignment panel inside ComplaintDetail.
 *
 * Data source: GET /api/v1/officer-assignments/<complaintId>/
 *   - 200  → shows assignment card with designation + deadline
 *   - 404  → no assignment yet (admin hasn't mapped the restaurant)
 *   - error → error state with retry
 *
 * PROTOTYPE DISCLAIMER: Not an officially integrated government system.
 * All designations shown are sample prototype accounts.
 * No real government officials are linked.
 */
import axios from 'axios'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldAlert,
  UserCheck,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatDate, formatDateTime } from '@/lib/format'
import { useLanguage } from '@/i18n/LanguageContext'
import { useOfficerAssignment } from '@/hooks/useOfficerAssignment'
import type { Complaint } from '@/types/complaint'
import type { OfficerAssignment } from '@/types/officerAssignment'

// ── Status display map ────────────────────────────────────────────────────────

const STATUS_DISPLAY: Record<
  OfficerAssignment['status'],
  { label: string; color: string; icon: React.ElementType }
> = {
  ASSIGNED:            { label: 'Assigned — awaiting review',  color: 'bg-primary-100 text-primary-700', icon: UserCheck },
  UNDER_INVESTIGATION: { label: 'Under investigation',         color: 'bg-warning-100 text-warning-700', icon: ShieldAlert },
  ACTION_TAKEN:        { label: 'Action taken',                color: 'bg-info-100 text-info-600',       icon: CheckCircle2 },
  ESCALATED:           { label: 'Escalated to next authority', color: 'bg-warning-100 text-warning-700', icon: ShieldAlert },
  RESOLVED:            { label: 'Resolved at this level',      color: 'bg-success-100 text-success-700', icon: CheckCircle2 },
  ON_HOLD:             { label: 'On hold (administrative)',    color: 'bg-neutral-100 text-neutral-600', icon: Clock },
}

// ── Active assignment card ────────────────────────────────────────────────────

function AssignmentCard({ assignment }: { assignment: OfficerAssignment }) {
  const { language } = useLanguage()
  const cfg = STATUS_DISPLAY[assignment.status] ?? STATUS_DISPLAY.ASSIGNED
  const Icon = cfg.icon

  return (
    <div className="rounded-2xl border border-primary-100 bg-white p-5 shadow-sm">
      {/* Prototype banner */}
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-warning-50 px-3 py-2">
        <AlertCircle className="size-4 shrink-0 text-warning-600" aria-hidden="true" />
        <p className="text-xs font-medium text-warning-700">
          Prototype workflow — not an officially integrated government complaint system.
        </p>
      </div>

      {/* Officer info */}
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
          <UserCheck className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-neutral-900">
            Food Safety Officer Review
          </h4>
          <p className="mt-0.5 text-sm text-neutral-700">{assignment.officer_designation}</p>
          {assignment.officer_jurisdiction && (
            <p className="mt-0.5 text-xs text-neutral-500">{assignment.officer_jurisdiction}</p>
          )}
        </div>
        <span
          className={cn(
            'ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
            cfg.color,
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
          {cfg.label}
        </span>
      </div>

      {/* Meta */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="font-semibold uppercase tracking-wide text-neutral-400">Authority level</p>
          <p className="mt-0.5 text-neutral-700">{assignment.level_name}</p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wide text-neutral-400">Assigned on</p>
          <p className="mt-0.5 text-neutral-700">{formatDate(assignment.assigned_at, language)}</p>
        </div>
        <div>
          <p className={cn(
            'font-semibold uppercase tracking-wide',
            assignment.is_overdue ? 'text-danger-500' : 'text-neutral-400',
          )}>
            Response deadline
          </p>
          <p className={cn(
            'mt-0.5',
            assignment.is_overdue ? 'font-semibold text-danger-600' : 'text-neutral-700',
          )}>
            {formatDateTime(assignment.effective_deadline, language)}
            {assignment.is_overdue && ' — OVERDUE'}
          </p>
        </div>
      </div>

      {/* Action taken (customer-visible only) */}
      {assignment.action_taken && (
        <div className="mt-4 rounded-xl border border-success-100 bg-success-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-success-600">
            Action taken
          </p>
          <p className="mt-1 text-sm leading-relaxed text-success-700">
            {assignment.action_taken}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Pending notice (shown when no assignment configured yet) ─────────────────

function PendingNotice() {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-primary-100 bg-primary-50/60 p-5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
        <ShieldAlert className="size-4.5" aria-hidden="true" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-primary-900">
          Food Safety Officer Review
        </h4>
        <p className="mt-1 text-sm leading-relaxed text-primary-700">
          Submitted complaints are routed to the designated Food Safety Officer for the
          restaurant's jurisdiction. Officer assignment details will appear here once
          the review is initiated.
        </p>
        <p className="mt-2 text-xs text-primary-500 italic">
          Prototype workflow — not an officially integrated government complaint system.
        </p>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function OfficerWorkflowSeam({ complaint }: { complaint: Complaint }) {
  const { data: assignment, isLoading, isError, error } = useOfficerAssignment(complaint.id)

  // Don't render anything for SUBMITTED complaints that haven't been reviewed
  if (complaint.status === 'SUBMITTED' && !isLoading && !assignment) {
    return <PendingNotice />
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-5">
        <Loader2 className="size-5 animate-spin text-primary-500" aria-hidden="true" />
        <span className="text-sm text-neutral-500">Loading officer assignment…</span>
      </div>
    )
  }

  // 404 = no assignment configured yet
  const is404 = axios.isAxiosError(error) && error.response?.status === 404
  if (is404 || !assignment) {
    return <PendingNotice />
  }

  if (isError) {
    // Non-404 error — show pending notice rather than an error card
    return <PendingNotice />
  }

  return <AssignmentCard assignment={assignment} />
}
