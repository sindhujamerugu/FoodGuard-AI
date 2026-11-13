/**
 * MyFeedback — customer feedback history page.
 *
 * Shows all feedback submitted by the authenticated customer,
 * with moderation status, restaurant name, complaint reference,
 * star rating and comments.
 *
 * Data: GET /api/v1/feedback/ (backend scopes to own records for CUSTOMER role)
 */
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Calendar,
  Hash,
  MessageSquare,
  Plus,
  Star,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Reveal } from '@/components/motion/Reveal'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { ListSkeleton } from '@/components/states/LoadingSkeleton'
import { useFeedback } from '@/hooks/useFeedback'
import { formatDate } from '@/lib/format'
import { useLanguage } from '@/i18n/LanguageContext'
import { cn } from '@/lib/cn'
import type { Feedback, ModerationStatus } from '@/types/feedback'

// ── Star display ──────────────────────────────────────────────────────────────

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star
          key={s}
          className={cn(
            'size-4 transition-colors',
            s <= rating ? 'fill-warning-400 text-warning-400' : 'text-neutral-200',
          )}
          aria-hidden="true"
        />
      ))}
      <span className="ml-1.5 text-xs font-semibold text-neutral-600">{rating}/5</span>
    </div>
  )
}

// ── Moderation badge ──────────────────────────────────────────────────────────

const MODERATION_BADGE: Record<ModerationStatus, { label: string; cls: string }> = {
  PENDING:  { label: 'Under Review',  cls: 'bg-warning-100 text-warning-700' },
  APPROVED: { label: 'Published',     cls: 'bg-success-100 text-success-700' },
  REJECTED: { label: 'Not Published', cls: 'bg-neutral-100 text-neutral-500' },
}

// ── Feedback card ─────────────────────────────────────────────────────────────

function FeedbackCard({ item }: { item: Feedback }) {
  const { language } = useLanguage()
  const badge = MODERATION_BADGE[item.moderation_status]

  return (
    <div className="group flex gap-0 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md">
      {/* Left status strip */}
      <div className={cn(
        'w-1 shrink-0',
        item.moderation_status === 'APPROVED' ? 'bg-success-400' :
        item.moderation_status === 'REJECTED' ? 'bg-neutral-300' : 'bg-warning-400',
      )} aria-hidden="true" />

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        {/* Row 1: complaint ref + moderation badge */}
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/complaints/${item.complaint.id}`}
            className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-0.5 text-xs font-mono font-semibold text-primary-700 hover:bg-primary-100 transition-colors"
          >
            <Hash className="size-3" aria-hidden="true" />
            Complaint #{item.complaint.id}
          </Link>
          <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-bold leading-none', badge.cls)}>
            {badge.label}
          </span>
        </div>

        {/* Row 2: complaint title */}
        <p className="truncate text-sm font-semibold text-neutral-900">
          {item.complaint.title}
        </p>

        {/* Row 3: star rating */}
        <StarDisplay rating={item.rating} />

        {/* Row 4: comments */}
        {item.comments && (
          <p className="line-clamp-2 text-sm leading-relaxed text-neutral-600 italic">
            "{item.comments}"
          </p>
        )}

        {/* Footer: date + link */}
        <div className="flex items-center justify-between gap-2 border-t border-neutral-50 pt-2">
          <span className="flex items-center gap-1 text-xs text-neutral-400">
            <Calendar className="size-3" aria-hidden="true" />
            {formatDate(item.created_at, language)}
          </span>
          <Link
            to={`/complaints/${item.complaint.id}`}
            className="hidden items-center gap-1 text-xs font-medium text-primary-600 opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:flex hover:text-primary-700"
          >
            View complaint <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MyFeedback() {
  const { data, isLoading, isError, refetch } = useFeedback()
  const feedbackList = data ?? []

  return (
    <AppShell title="My Feedback">

      {/* Header */}
      <Reveal variant="fade" className="mb-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">My Feedback</h2>
            <p className="mt-1 max-w-xl text-sm text-neutral-500">
              All feedback you have submitted for resolved complaints.
              Feedback appears publicly once approved by a reviewer.
            </p>
          </div>
          <Link
            to="/complaints"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-neutral-50 hover:shadow-md"
          >
            <MessageSquare className="size-4" aria-hidden="true" />
            My Complaints
          </Link>
        </div>
      </Reveal>

      {/* Summary stats */}
      {!isLoading && feedbackList.length > 0 && (
        <Reveal delay={40} className="mb-6 grid grid-cols-3 gap-4">
          {[
            { label: 'Total',    value: feedbackList.length,                                             color: 'text-primary-800', bg: 'bg-primary-50 border-primary-100' },
            { label: 'Approved', value: feedbackList.filter(f => f.moderation_status === 'APPROVED').length, color: 'text-success-700', bg: 'bg-success-50 border-success-100' },
            { label: 'Pending',  value: feedbackList.filter(f => f.moderation_status === 'PENDING').length,  color: 'text-warning-700', bg: 'bg-warning-50 border-warning-100' },
          ].map(s => (
            <div key={s.label} className={cn('rounded-2xl border p-4 text-center', s.bg)}>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{s.label}</p>
              <p className={cn('mt-1 text-2xl font-black', s.color)}>{s.value}</p>
            </div>
          ))}
        </Reveal>
      )}

      {/* States */}
      {isLoading && <ListSkeleton items={3} />}
      {isError   && <ErrorState message="Couldn't load your feedback." onRetry={() => refetch()} />}

      {!isLoading && !isError && feedbackList.length === 0 && (
        <EmptyState
          icon={<Star className="size-6" aria-hidden="true" />}
          title="No feedback yet"
          description="You can submit feedback after a complaint has been resolved or closed."
          action={
            <Link
              to="/complaints"
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              <Plus className="size-4" aria-hidden="true" /> View My Complaints
            </Link>
          }
        />
      )}

      {/* Feedback list */}
      {feedbackList.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {feedbackList.map((item, i) => (
            <Reveal key={item.id} delay={Math.min(i * 40, 200)}>
              <FeedbackCard item={item} />
            </Reveal>
          ))}
        </div>
      )}
    </AppShell>
  )
}
