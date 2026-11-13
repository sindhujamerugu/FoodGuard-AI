/**
 * ComplaintDetail — customer-facing complaint tracking page.
 *
 * Layout:
 *  ┌────────────────────────────────────┬──────────────────┐
 *  │ Complaint info + description        │ Timeline         │
 *  │ AI assessment (from linked report)  │                  │
 *  │ Officer workflow notice             │                  │
 *  └────────────────────────────────────┴──────────────────┘
 *
 * Data sources:
 *  - GET /api/v1/complaints/:id/           → complaint + linked report stub
 *  - GET /api/v1/reports/:id/              → full report (image, description)
 *  - GET /api/v1/reports/:id/analysis/     → AI assessment (404 = not yet run)
 *  - GET /api/v1/notifications/            → timeline notification events
 *
 * Access control enforced by backend — customers only see their own records.
 */
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  FileText,
  Hash,
  ImageOff,
  Info,
  MapPin,
  MessageSquare,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { PriorityBadge } from '@/components/badges/PriorityBadge'
import { AIAnalysisCard } from '@/components/ai/AIAnalysisCard'
import { AIDisclaimer } from '@/components/ai/AIDisclaimer'
import { ComplaintTimeline } from '@/components/complaints/ComplaintTimeline'
import { OfficerWorkflowSeam } from '@/components/complaints/OfficerWorkflowSeam'
import { Reveal } from '@/components/motion/Reveal'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/LoadingSkeleton'
import { useComplaint } from '@/hooks/useComplaints'
import { useReport } from '@/hooks/useReports'
import { useAIAnalysis } from '@/hooks/useAIAnalysis'
import { useNotifications } from '@/hooks/useNotifications'
import { useFeedback } from '@/hooks/useFeedback'
import { useTranslation, type TranslationKey } from '@/i18n'
import { formatDate, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'

// ── Category labels ───────────────────────────────────────────────────────────

const CATEGORY_KEYS: Record<string, TranslationKey> = {
  FOOD_QUALITY:   'category.foodQuality',
  SPOILAGE:       'category.spoilage',
  FOREIGN_OBJECT: 'category.foreignObject',
  HYGIENE:        'category.hygiene',
  TASTE_OR_ODOR:  'category.tasteOrOdor',
  OTHER:          'category.other',
}

// ── Info row (label + value) ───────────────────────────────────────────────────

function InfoRow({
  icon: Icon, label, value, mono = false,
}: {
  icon: React.ElementType; label: string; value: React.ReactNode; mono?: boolean
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
        <Icon className="size-3.5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
        <p className={cn('mt-0.5 text-sm text-neutral-800', mono && 'font-mono break-all')}>{value}</p>
      </div>
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({
  title, icon: Icon, children, className,
}: {
  title: string; icon: React.ElementType; children: React.ReactNode; className?: string
}) {
  return (
    <div className={cn('rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm', className)}>
      <div className="mb-4 flex items-center gap-2 border-b border-neutral-50 pb-3">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ── AI Assessment section ─────────────────────────────────────────────────────

function AISection({ reportId }: { reportId: number }) {
  const { data: analysis, isLoading, isError, error, refetch } = useAIAnalysis(reportId)
  const is404 = axios.isAxiosError(error) && error.response?.status === 404

  if (isLoading) return <Skeleton className="h-36 w-full rounded-xl" />

  if (is404) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-5 text-center">
        <Sparkles className="mx-auto mb-2 size-6 text-neutral-300" aria-hidden="true" />
        <p className="text-sm text-neutral-500">No AI assessment has been run for this report yet.</p>
        <AIDisclaimer />
      </div>
    )
  }

  if (isError) {
    return <ErrorState message="Couldn't load AI assessment." onRetry={() => refetch()} />
  }

  if (!analysis) return null

  return <AIAnalysisCard analysis={analysis} />
}

// ── Evidence image ─────────────────────────────────────────────────────────────

function EvidenceImage({ reportId }: { reportId: number }) {
  const { data: report, isLoading } = useReport(reportId)

  if (isLoading) return <Skeleton className="aspect-video w-full rounded-xl" />

  if (!report?.image) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50">
        <div className="text-center">
          <ImageOff className="mx-auto mb-2 size-8 text-neutral-300" aria-hidden="true" />
          <p className="text-xs text-neutral-400">No photograph attached</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-100">
      <img
        src={report.image}
        alt="Evidence photograph"
        className="w-full object-cover"
        loading="lazy"
      />
    </div>
  )
}

// ── Location from structured columns (not description parsing) ───────────────

function locationString(report: { location_lat?: string | null; location_lng?: string | null } | undefined): string | null {
  if (!report?.location_lat || !report?.location_lng) return null
  return `${Number(report.location_lat).toFixed(6)}, ${Number(report.location_lng).toFixed(6)}`
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ComplaintDetail() {
  const { t, language } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const complaintId = Number(id)

  const { data: complaint, isLoading, isError, refetch } = useComplaint(complaintId)
  const { data: report } = useReport(complaint?.food_report.id ?? 0)
  const { data: notifications = [] } = useNotifications()
  const { data: feedbackList = [] } = useFeedback()

  const categoryKey     = complaint ? CATEGORY_KEYS[complaint.category] : undefined
  const categoryLabel   = categoryKey ? t(categoryKey) : complaint?.category ?? ''
  const locationStr     = locationString(report)

  // Escalation events from notifications
  const escalationNotifs = notifications.filter(
    n => n.related_complaint === complaintId &&
         (n.event_type === 'ESCALATION_CREATED' || n.event_type === 'ESCALATION_UPDATED')
  )
  const isEscalated = escalationNotifs.length > 0

  // Feedback for this complaint
  const existingFeedback = feedbackList.find(f => f.complaint.id === complaintId)
  const canSubmitFeedback = complaint &&
    (complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') &&
    !existingFeedback

  return (
    <AppShell title="Complaint Details">
      <div className="mx-auto max-w-5xl">

        {/* ── Back link ── */}
        <Link
          to="/complaints"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to My Complaints
        </Link>

        {/* ── Loading / error ── */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          </div>
        )}

        {isError && (
          <ErrorState message={t('complaints.detail.loadError')} onRetry={() => refetch()} />
        )}

        {complaint && (
          <div className="space-y-5">

            {/* ── Hero header ── */}
            <Reveal variant="fade">
              <div className="relative overflow-hidden rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
                {/* Top row */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                      <MessageSquare className="size-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-0.5 text-xs font-mono font-semibold text-primary-700">
                          <Hash className="size-3" aria-hidden="true" />
                          {complaint.id}
                        </span>
                        <StatusBadge status={complaint.status} />
                        <PriorityBadge priority={complaint.priority} />
                      </div>
                      <h1 className="mt-1.5 text-xl font-bold text-neutral-900">
                        {complaint.title}
                      </h1>
                    </div>
                  </div>
                </div>

                {/* Meta grid */}
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoRow icon={UtensilsCrossed} label="Food item"      value={complaint.food_report.title} />
                  <InfoRow icon={Building2}       label="Restaurant"     value={`${complaint.restaurant.name}${complaint.restaurant.city ? ` · ${complaint.restaurant.city}` : ''}`} />
                  <InfoRow icon={Tag}             label="Category"       value={categoryLabel} />
                  <InfoRow icon={Calendar}        label="Filed on"       value={formatDate(complaint.submitted_at, language)} />
                  <InfoRow icon={Calendar}        label="Last updated"   value={formatDateTime(complaint.updated_at, language)} />
                  {complaint.resolved_at && (
                    <InfoRow icon={CheckCircle2}  label="Resolved on"    value={formatDateTime(complaint.resolved_at, language)} />
                  )}
                  {complaint.rejected_at && (
                    <InfoRow icon={XCircle}       label="Rejected on"    value={formatDateTime(complaint.rejected_at, language)} />
                  )}
                  {locationStr && (
                    <InfoRow icon={MapPin}        label="Location"       value={locationStr} mono />
                  )}
                </div>
              </div>
            </Reveal>

            {/* ── Main 2-col grid ── */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">

              {/* Left column */}
              <div className="space-y-5">

                {/* Description */}
                <Reveal delay={40}>
                  <SectionCard title="Complaint Description" icon={FileText}>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                      {complaint.description}
                    </p>
                    {/* Category + linked report */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700">
                        <Tag className="size-3.5" aria-hidden="true" />
                        {categoryLabel}
                      </span>
                      <Link
                        to={`/reports/${complaint.food_report.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-primary-200 hover:text-primary-700 transition-colors"
                      >
                        <FileText className="size-3.5" aria-hidden="true" />
                        Report #{complaint.food_report.id}: {complaint.food_report.title}
                        → {complaint.food_report.status}
                      </Link>
                    </div>
                  </SectionCard>
                </Reveal>

                {/* Original report description — separate from the formal complaint description */}
                {report?.description && report.description !== complaint.description && (
                  <Reveal delay={50}>
                    <SectionCard title="Original Food Report Description" icon={FileText}>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">
                        {report.description}
                      </p>
                    </SectionCard>
                  </Reveal>
                )}

                {/* Evidence photograph */}
                <Reveal delay={60}>
                  <SectionCard title="Evidence Photograph" icon={FileText}>
                    <EvidenceImage reportId={complaint.food_report.id} />
                  </SectionCard>
                </Reveal>

                {/* AI Assessment */}
                <Reveal delay={80}>
                  <SectionCard title="AI Visual Assessment" icon={Sparkles}>
                    <AISection reportId={complaint.food_report.id} />
                  </SectionCard>
                </Reveal>

                {/* Resolution notes — only shown when present */}
                {complaint.resolution_notes && (
                  <Reveal delay={100}>
                    <div className="rounded-2xl border border-success-200 bg-success-50 p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <CheckCircle2 className="size-4.5 text-success-600" aria-hidden="true" />
                        <h3 className="text-sm font-semibold text-success-800">Resolution Notes</h3>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-success-700">
                        {complaint.resolution_notes}
                      </p>
                    </div>
                  </Reveal>
                )}

                {/* Rejection notice — shown when complaint is rejected */}
                {complaint.status === 'REJECTED' && (
                  <Reveal delay={100}>
                    <div className="rounded-2xl border border-danger-200 bg-danger-50 p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <XCircle className="size-4.5 text-danger-600" aria-hidden="true" />
                        <h3 className="text-sm font-semibold text-danger-800">Complaint Rejected</h3>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-danger-700">
                        {complaint.rejection_reason || 'No specific rationale provided.'}
                      </p>
                      {complaint.rejected_at && (
                        <p className="mt-3 text-xs text-danger-600 font-mono">
                          Decision recorded on {formatDateTime(complaint.rejected_at, language)}
                        </p>
                      )}
                    </div>
                  </Reveal>
                )}

                {/* Officer workflow notice */}
                {complaint.status !== 'SUBMITTED' && (
                  <Reveal delay={120}>
                    <OfficerWorkflowSeam complaint={complaint} />
                  </Reveal>
                )}

              </div>

              {/* Right column — Status summary + Timeline */}
              <Reveal delay={80}>
                <div className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">

                  {/* Status summary card */}
                  <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 border-b border-neutral-50 pb-3">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                      </div>
                      <h3 className="text-sm font-semibold text-neutral-900">Complaint Status</h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Current status</p>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <StatusBadge status={complaint.status} />
                          {isEscalated && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-warning-100 px-2.5 py-0.5 text-[10px] font-bold text-warning-700">
                              <TrendingUp className="size-3" aria-hidden="true" />
                              Escalated
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Filed on</p>
                        <p className="mt-0.5 text-sm text-neutral-800">{formatDate(complaint.submitted_at, language)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Last updated</p>
                        <p className="mt-0.5 text-sm text-neutral-800">{formatDateTime(complaint.updated_at, language)}</p>
                      </div>
                      {complaint.resolved_at && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Resolved on</p>
                          <p className="mt-0.5 text-sm text-neutral-800">{formatDateTime(complaint.resolved_at, language)}</p>
                        </div>
                      )}
                      {complaint.rejected_at && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Rejected on</p>
                          <p className="mt-0.5 text-sm text-neutral-800">{formatDateTime(complaint.rejected_at, language)}</p>
                        </div>
                      )}
                    </div>

                    {/* Feedback CTA */}
                    {canSubmitFeedback && (
                      <div className="mt-4 border-t border-neutral-50 pt-4">
                        <Link
                          to={`/feedback/new?complaintId=${complaint.id}`}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-warning-50 px-4 py-2.5 text-sm font-semibold text-warning-700 transition-colors hover:bg-warning-100"
                        >
                          <Star className="size-4" aria-hidden="true" />
                          Submit Feedback
                        </Link>
                      </div>
                    )}
                    {existingFeedback && (
                      <div className="mt-4 border-t border-neutral-50 pt-4">
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`size-4 ${s <= existingFeedback.rating ? 'fill-warning-400 text-warning-400' : 'text-neutral-200'}`} aria-hidden="true" />
                          ))}
                        </div>
                        <p className="mt-1 text-xs text-neutral-500">
                          {existingFeedback.moderation_status === 'APPROVED'
                            ? '✅ Feedback published'
                            : existingFeedback.moderation_status === 'REJECTED'
                            ? '❌ Not published'
                            : '⏳ Under review'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Timeline card */}
                  <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2 border-b border-neutral-50 pb-3">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                        <Info className="size-4" aria-hidden="true" />
                      </div>
                      <h3 className="text-sm font-semibold text-neutral-900">Status Timeline</h3>
                    </div>
                    <ComplaintTimeline complaint={complaint} />
                  </div>

                </div>
              </Reveal>

            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
