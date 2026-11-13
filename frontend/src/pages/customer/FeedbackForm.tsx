/**
 * FeedbackForm — submit feedback for a RESOLVED or CLOSED complaint.
 *
 * Route: /feedback/new?complaintId=<id>
 *
 * Workflow:
 *  1. Load complaint from cached useComplaints() — no extra API call.
 *  2. Validate complaint is RESOLVED or CLOSED, owned by this customer.
 *  3. Check the existing feedback list — if already submitted → show existing.
 *  4. Star rating selector (1–5) + text area.
 *  5. POST /api/v1/feedback/ → show success confirmation.
 */
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Hash,
  MessageSquare,
  Send,
  Star,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Reveal } from '@/components/motion/Reveal'
import { Skeleton } from '@/components/states/LoadingSkeleton'
import { useComplaints } from '@/hooks/useComplaints'
import { useCreateFeedback, useFeedback } from '@/hooks/useFeedback'
import { toApiError } from '@/types/errors'
import { cn } from '@/lib/cn'

// ── Star selector ─────────────────────────────────────────────────────────────

function StarSelector({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  const [hover, setHover] = useState(0)

  const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className={cn(
              'transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
              disabled ? 'cursor-not-allowed opacity-50' : 'hover:scale-110',
            )}
            aria-label={`Rate ${star} out of 5`}
          >
            <Star
              className={cn(
                'size-9 transition-colors duration-150',
                (hover || value) >= star
                  ? 'fill-warning-400 text-warning-400'
                  : 'text-neutral-300',
              )}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      {(hover || value) > 0 && (
        <p className="text-sm font-semibold text-warning-600">
          {labels[hover || value]}
        </p>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FeedbackForm() {
  const [params]   = useSearchParams()

  const complaintId = Number(params.get('complaintId') ?? '0')

  const { data: complaints = [], isLoading: complaintsLoading } = useComplaints()
  const { data: feedbackList = [], isLoading: feedbackLoading } = useFeedback()
  const createFeedback = useCreateFeedback()

  const [rating,       setRating]      = useState(0)
  const [comments,     setComments]    = useState('')
  const [submitError,  setSubmitError] = useState<string | null>(null)
  const [submitted,    setSubmitted]   = useState(false)

  const complaint    = complaints.find(c => c.id === complaintId)
  const existing     = feedbackList.find(f => f.complaint.id === complaintId)
  const isResolved   = complaint?.status === 'RESOLVED' || complaint?.status === 'CLOSED'
  const isLoading    = complaintsLoading || feedbackLoading

  // ── Guard: no complaintId in URL ──────────────────────────────────
  if (!complaintId) {
    return (
      <AppShell title="Submit Feedback">
        <div className="mx-auto max-w-xl py-16 text-center">
          <AlertCircle className="mx-auto mb-4 size-12 text-warning-400" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-neutral-900">No complaint selected</h2>
          <p className="mt-2 text-sm text-neutral-500">
            Please open a resolved complaint and click "Submit Feedback" from there.
          </p>
          <Link to="/complaints" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700">
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to My Complaints
          </Link>
        </div>
      </AppShell>
    )
  }

  if (isLoading) {
    return (
      <AppShell title="Submit Feedback">
        <div className="mx-auto max-w-xl space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </AppShell>
    )
  }

  // ── Guard: complaint not found / not owned ────────────────────────
  if (!complaint) {
    return (
      <AppShell title="Submit Feedback">
        <div className="mx-auto max-w-xl py-16 text-center">
          <AlertCircle className="mx-auto mb-4 size-12 text-danger-400" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-neutral-900">Complaint not found</h2>
          <Link to="/complaints" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700">
            <ArrowLeft className="size-4" /> Back to My Complaints
          </Link>
        </div>
      </AppShell>
    )
  }

  // ── Guard: feedback already submitted ────────────────────────────
  if (existing) {
    return (
      <AppShell title="Feedback Submitted">
        <Reveal variant="fade" className="mx-auto max-w-xl">
          <div className="rounded-2xl border border-success-200 bg-success-50 p-8 text-center">
            <CheckCircle2 className="mx-auto mb-4 size-14 text-success-500" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-success-800">Feedback already submitted</h2>
            <p className="mt-2 text-sm text-success-700">
              You submitted feedback for this complaint on{' '}
              {new Date(existing.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}.
            </p>
            <div className="mt-4 flex justify-center gap-1">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={cn('size-6', s <= existing.rating ? 'fill-warning-400 text-warning-400' : 'text-neutral-300')} aria-hidden="true" />
              ))}
            </div>
            {existing.comments && (
              <p className="mt-3 text-sm italic text-success-700">"{existing.comments}"</p>
            )}
            <Link to="/my-feedback" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
              View My Feedback
            </Link>
          </div>
        </Reveal>
      </AppShell>
    )
  }

  // ── Guard: complaint not resolved ────────────────────────────────
  if (!isResolved) {
    return (
      <AppShell title="Submit Feedback">
        <div className="mx-auto max-w-xl rounded-2xl border border-warning-200 bg-warning-50 p-8 text-center">
          <AlertCircle className="mx-auto mb-4 size-12 text-warning-500" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-warning-800">Feedback not available yet</h2>
          <p className="mt-2 text-sm text-warning-700">
            Feedback can only be submitted after a complaint is resolved or closed.
            This complaint is currently <strong>{complaint.status.replace('_', ' ')}</strong>.
          </p>
          <Link to={`/complaints/${complaint.id}`} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700">
            <ArrowLeft className="size-4" /> View Complaint
          </Link>
        </div>
      </AppShell>
    )
  }

  // ── Success screen ────────────────────────────────────────────────
  if (submitted) {
    return (
      <AppShell title="Feedback Submitted">
        <Reveal variant="fade" className="mx-auto max-w-lg py-12 text-center">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-success-100">
            <CheckCircle2 className="size-10 text-success-600" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold text-primary-900">Thank you for your feedback!</h2>
          <p className="mt-2 text-neutral-500">
            Your feedback has been received and is under review. It will be published once approved.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/my-feedback" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700">
              View My Feedback
            </Link>
            <Link to="/complaints" className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
              Back to Complaints
            </Link>
          </div>
        </Reveal>
      </AppShell>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (rating < 1) {
      setSubmitError('Please select a star rating before submitting.')
      return
    }
    if (comments.trim().length > 0 && comments.trim().length < 10) {
      setSubmitError('Please write at least 10 characters in your feedback, or leave it blank.')
      return
    }
    setSubmitError(null)
    try {
      await createFeedback.mutateAsync({
        complaint: complaintId,
        rating,
        comments: comments.trim(),
      })
      setSubmitted(true)
    } catch (err) {
      setSubmitError(toApiError(err).message || 'Submission failed. Please try again.')
    }
  }

  return (
    <AppShell title="Submit Feedback">
      <div className="mx-auto max-w-xl">
        <Link to={`/complaints/${complaint.id}`} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to complaint
        </Link>

        {/* Complaint summary */}
        <Reveal variant="fade" className="mb-5">
          <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                <MessageSquare className="size-5" aria-hidden="true" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-0.5 text-xs font-mono font-semibold text-primary-700">
                    <Hash className="size-3" aria-hidden="true" />
                    {complaint.id}
                  </span>
                  <span className="rounded-full bg-success-100 px-2.5 py-0.5 text-xs font-semibold text-success-700">
                    {complaint.status}
                  </span>
                </div>
                <h2 className="mt-1 text-sm font-semibold text-neutral-900">{complaint.title}</h2>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
                  <Building2 className="size-3" aria-hidden="true" />
                  {complaint.restaurant.name}
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Feedback form */}
        <Reveal delay={40}>
          <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
            <h3 className="mb-1 text-lg font-semibold text-neutral-900">How was your experience?</h3>
            <p className="mb-6 text-sm text-neutral-500">
              Rate how satisfied you are with how your complaint was handled.
            </p>

            {/* Star rating */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-semibold text-neutral-700">
                Your rating <span className="text-danger-500">*</span>
              </label>
              <StarSelector
                value={rating}
                onChange={setRating}
                disabled={createFeedback.isPending}
              />
            </div>

            {/* Comments */}
            <div className="mb-6">
              <label htmlFor="feedback-comments" className="mb-1.5 block text-sm font-semibold text-neutral-700">
                Your feedback <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="feedback-comments"
                value={comments}
                onChange={e => setComments(e.target.value)}
                disabled={createFeedback.isPending}
                rows={4}
                maxLength={1000}
                placeholder="Share your experience with how your complaint was handled…"
                className="w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-sm transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:bg-neutral-50"
              />
              <p className="mt-1 text-right text-xs text-neutral-400">
                {comments.length}/1000 characters
              </p>
            </div>

            {/* Error */}
            {submitError && (
              <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger-600" aria-hidden="true" />
                <p className="text-sm text-danger-700">{submitError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-3">
              <Link to={`/complaints/${complaint.id}`} className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors">
                Cancel
              </Link>
              <Button
                onClick={handleSubmit}
                isLoading={createFeedback.isPending}
                disabled={rating < 1}
                className="min-w-[140px]"
              >
                <Send className="size-4" aria-hidden="true" />
                {createFeedback.isPending ? 'Submitting…' : 'Submit Feedback'}
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </AppShell>
  )
}
