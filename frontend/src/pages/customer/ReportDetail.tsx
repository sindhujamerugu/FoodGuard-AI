/**
 * ReportDetail — customer-facing report details page.
 *
 * Layout (top → bottom):
 *  1. Back link + action buttons
 *  2. Hero header (ref badge, title, status, priority)
 *  3. Two-column grid on desktop:
 *       Left  — ReportOverview (image, description, location)
 *       Right — Status sidebar (AI assessment chip, linked complaint, timestamps)
 *  4. Full-width AI assessment card (loads separately)
 *  5. Full-width linked complaint card (from cached complaints list)
 *
 * Data sources:
 *  - GET /api/v1/reports/:id/           → report + location_lat/lng
 *  - GET /api/v1/reports/:id/analysis/  → AI assessment (404 = not yet run)
 *  - GET /api/v1/complaints/            → find complaint linked to this report (already cached)
 *
 * No new API endpoints needed.
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import {
  ArrowLeft,
  CheckCircle2,
  Hash,
  MessageSquare,
  Navigation,
  Pencil,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { ReportOverview } from '@/components/reports/ReportOverview'
import { AIAnalysisCard } from '@/components/ai/AIAnalysisCard'
import { AIDisclaimer } from '@/components/ai/AIDisclaimer'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { PriorityBadge } from '@/components/badges/PriorityBadge'
import { Button } from '@/components/ui/Button'
import { LinkButton } from '@/components/ui/LinkButton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/LoadingSkeleton'
import { Reveal } from '@/components/motion/Reveal'
import { useDeleteReport, useReport, useSubmitReport } from '@/hooks/useReports'
import { useAIAnalysis, useRunAIAnalysis } from '@/hooks/useAIAnalysis'
import { useComplaints } from '@/hooks/useComplaints'
import { useTranslation } from '@/i18n'
import { formatDate, formatDateTime } from '@/lib/format'
import { toApiError } from '@/types/errors'
import { cn } from '@/lib/cn'

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

// ── AI section ────────────────────────────────────────────────────────────────

function AISection({ reportId, hasImage }: { reportId: number; hasImage: boolean }) {
  const { data: analysis, isLoading, isError, error, refetch } = useAIAnalysis(reportId)
  const runAnalysis = useRunAIAnalysis(reportId)
  const [runError, setRunError] = useState<string | null>(null)
  const is404 = axios.isAxiosError(error) && error.response?.status === 404

  async function handleRun() {
    setRunError(null)
    try { await runAnalysis.mutateAsync() }
    catch (e) { setRunError(toApiError(e).message) }
  }

  if (isLoading) return <Skeleton className="h-36 w-full rounded-xl" />

  if (is404) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-5 text-center">
        <Sparkles className="mx-auto mb-2 size-6 text-neutral-300" aria-hidden="true" />
        <p className="text-sm text-neutral-500">No AI assessment has been run yet.</p>
        {hasImage ? (
          <Button size="sm" className="mt-3" isLoading={runAnalysis.isPending} onClick={handleRun}>
            <Sparkles className="size-4" aria-hidden="true" />
            Run AI Assessment
          </Button>
        ) : (
          <p className="mt-2 text-xs text-neutral-400">Upload an evidence photograph to enable AI assessment.</p>
        )}
        {runError && (
          <p role="alert" className="mt-2 text-xs text-danger-600">{runError}</p>
        )}
        <div className="mt-4"><AIDisclaimer /></div>
      </div>
    )
  }

  if (isError) return <ErrorState message="Couldn't load AI assessment." onRetry={() => refetch()} />
  if (!analysis) return null

  return (
    <>
      <AIAnalysisCard analysis={analysis} />
      {runError && <p role="alert" className="mt-2 text-xs text-danger-600">{runError}</p>}
      <Button variant="outline" size="sm" className="mt-3" isLoading={runAnalysis.isPending} onClick={handleRun}>
        Re-run assessment
      </Button>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>()
  const reportId = Number(id)
  const navigate = useNavigate()
  const { t, language } = useTranslation()

  const { data: report, isLoading, isError, refetch } = useReport(reportId)
  const { data: complaints = [] } = useComplaints()
  const deleteReport  = useDeleteReport()
  const submitReport  = useSubmitReport(reportId)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [actionError,   setActionError]   = useState<string | null>(null)

  // Find complaint linked to this report from the already-cached list
  const linkedComplaint = complaints.find(c => c.food_report.id === reportId)

  const isDraft      = report?.status === 'DRAFT'
  const isSubmitted  = report?.status === 'SUBMITTED'
  const canHaveAI    = report && report.status !== 'DRAFT'
  const hasLocation  = report && report.location_lat != null && report.location_lng != null

  async function handleSubmit() {
    setActionError(null)
    try { await submitReport.mutateAsync() }
    catch (e) { setActionError(toApiError(e).message) }
  }

  async function handleDelete() {
    setActionError(null)
    try {
      await deleteReport.mutateAsync(reportId)
      navigate('/reports', { replace: true })
    } catch (e) {
      setActionError(toApiError(e).message)
      setConfirmDelete(false)
    }
  }

  return (
    <AppShell title="Report Details">
      <div className="mx-auto max-w-5xl">

        {/* Back link */}
        <Link
          to="/reports"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to My Reports
        </Link>

        {/* Loading / error */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
              <Skeleton className="h-96 w-full rounded-2xl" />
              <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
          </div>
        )}
        {isError && <ErrorState message={t('reports.detail.loadError')} onRetry={() => refetch()} />}

        {report && (
          <div className="space-y-5">

            {/* ── Hero header ── */}
            <Reveal variant="fade">
              <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Left: ref + title + badges */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-0.5 text-xs font-mono font-semibold text-primary-700">
                        <Hash className="size-3" aria-hidden="true" />
                        {report.id}
                      </span>
                      <StatusBadge status={report.status} />
                      <PriorityBadge priority={report.priority} />
                    </div>
                    <h1 className="mt-2 text-xl font-bold text-neutral-900">{report.title}</h1>
                    <p className="mt-0.5 text-sm text-neutral-500">{report.restaurant.name}</p>
                  </div>

                  {/* Right: action buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {isDraft && (
                      <>
                        <LinkButton to={`/reports/${report.id}/edit`} variant="outline" size="sm">
                          <Pencil className="size-4" aria-hidden="true" />
                          {t('reports.detail.edit')}
                        </LinkButton>
                        <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                          <Trash2 className="size-4" aria-hidden="true" />
                          {t('reports.detail.delete')}
                        </Button>
                        <Button size="sm" isLoading={submitReport.isPending} onClick={handleSubmit}>
                          <Send className="size-4" aria-hidden="true" />
                          {t('reports.detail.submitForReview')}
                        </Button>
                      </>
                    )}
                    {isSubmitted && !linkedComplaint && (
                      <LinkButton to={`/complaints/new?reportId=${report.id}`} size="sm" variant="outline">
                        <MessageSquare className="size-4" aria-hidden="true" />
                        {t('reports.detail.fileComplaint')}
                      </LinkButton>
                    )}
                    <LinkButton to={`/reports/${report.id}/ai-analysis`} size="sm" variant="ghost">
                      <Sparkles className="size-4" aria-hidden="true" />
                      {t('reports.detail.fullAiAssessment')}
                    </LinkButton>
                  </div>
                </div>

                {/* Draft notice */}
                {isDraft && (
                  <p className="mt-4 rounded-lg bg-warning-50 px-4 py-2.5 text-sm text-warning-700">
                    {t('reports.detail.draftNotice')}
                  </p>
                )}

                {/* Action error */}
                {actionError && (
                  <p role="alert" className="mt-3 rounded-lg bg-danger-50 px-4 py-2.5 text-sm text-danger-700">
                    {actionError}
                  </p>
                )}
              </div>
            </Reveal>

            {/* ── Main 2-col grid ── */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">

              {/* Left — full report overview */}
              <Reveal delay={40}>
                <ReportOverview report={report} />
              </Reveal>

              {/* Right — sidebar */}
              <div className="flex flex-col gap-5">

                {/* Status card */}
                <Reveal delay={60}>
                  <SectionCard title="Report Status" icon={CheckCircle2}>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Current status</p>
                        <div className="mt-1"><StatusBadge status={report.status} /></div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Filed on</p>
                        <p className="mt-0.5 text-neutral-800">{formatDate(report.created_at, language)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Last updated</p>
                        <p className="mt-0.5 text-neutral-800">{formatDateTime(report.updated_at, language)}</p>
                      </div>
                      {hasLocation && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 flex items-center gap-1">
                            <Navigation className="size-3" aria-hidden="true" />
                            Location on file
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-neutral-700">
                            {Number(report.location_lat).toFixed(6)}, {Number(report.location_lng).toFixed(6)}
                          </p>
                        </div>
                      )}
                    </div>
                  </SectionCard>
                </Reveal>

                {/* Linked complaint card */}
                {linkedComplaint && (
                  <Reveal delay={80}>
                    <SectionCard title="Linked Complaint" icon={MessageSquare}>
                      <div className="space-y-2.5 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-0.5 text-xs font-mono font-semibold text-primary-700">
                            <Hash className="size-3" aria-hidden="true" />
                            {linkedComplaint.id}
                          </span>
                          <StatusBadge status={linkedComplaint.status} />
                        </div>
                        <p className="text-xs text-neutral-700 font-medium">{linkedComplaint.title}</p>
                        <p className="text-xs text-neutral-500">{linkedComplaint.category.replace('_', ' ')}</p>
                        {linkedComplaint.resolution_notes && (
                          <div className="rounded-lg bg-success-50 p-3">
                            <p className="text-xs font-semibold text-success-700 mb-1">Resolution notes</p>
                            <p className="text-xs text-success-700 leading-relaxed">{linkedComplaint.resolution_notes}</p>
                          </div>
                        )}
                        <Link
                          to={`/complaints/${linkedComplaint.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                        >
                          View complaint details →
                        </Link>
                      </div>
                    </SectionCard>
                  </Reveal>
                )}
              </div>
            </div>

            {/* ── AI Assessment — full width ── */}
            {canHaveAI && (
              <Reveal delay={80}>
                <SectionCard title="AI Visual Assessment" icon={Sparkles}>
                  <AISection reportId={reportId} hasImage={!!report.image} />
                </SectionCard>
              </Reveal>
            )}

          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={confirmDelete}
        title={t('reports.detail.deleteConfirmTitle')}
        description={t('reports.detail.deleteConfirmDescription')}
        confirmLabel={t('reports.detail.delete')}
        destructive
        isLoading={deleteReport.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </AppShell>
  )
}
