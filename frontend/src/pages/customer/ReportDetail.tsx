import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { MessageSquare, Pencil, Send, Sparkles, Trash2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { ReportOverview } from '@/components/reports/ReportOverview'
import { AIAnalysisCard } from '@/components/ai/AIAnalysisCard'
import { AIDisclaimer } from '@/components/ai/AIDisclaimer'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LinkButton } from '@/components/ui/LinkButton'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/LoadingSkeleton'
import { Reveal } from '@/components/motion/Reveal'
import { useDeleteReport, useReport, useSubmitReport } from '@/hooks/useReports'
import { useAIAnalysis, useRunAIAnalysis } from '@/hooks/useAIAnalysis'
import { useComplaints } from '@/hooks/useComplaints'
import { useLanguage } from '@/i18n/LanguageContext'
import { formatDate } from '@/lib/format'
import { toApiError } from '@/types/errors'

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>()
  const reportId = Number(id)
  const navigate = useNavigate()
  const { t, language } = useLanguage()

  const { data: report, isLoading, isError, refetch } = useReport(reportId)
  const analysisQuery = useAIAnalysis(reportId)
  const runAnalysis = useRunAIAnalysis(reportId)
  const complaintsQuery = useComplaints()
  const deleteReport = useDeleteReport()
  const submitReport = useSubmitReport(reportId)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const linkedComplaint = complaintsQuery.data?.find((c) => c.food_report.id === reportId)
  const analysisNotFound = axios.isAxiosError(analysisQuery.error) && analysisQuery.error.response?.status === 404

  if (isLoading) {
    return (
      <AppShell title={t('reports.detail.pageTitle')}>
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </AppShell>
    )
  }

  if (isError || !report) {
    return (
      <AppShell title={t('reports.detail.pageTitle')}>
        <ErrorState message={t('reports.detail.loadError')} onRetry={() => refetch()} />
      </AppShell>
    )
  }

  const isDraft = report.status === 'DRAFT'
  const isSubmittedStatus = report.status === 'SUBMITTED'
  const canRunAnalysis = !!report.image

  async function handleSubmit() {
    setActionError(null)
    try {
      await submitReport.mutateAsync()
    } catch (error) {
      setActionError(toApiError(error).message)
    }
  }

  async function handleDelete() {
    setActionError(null)
    try {
      await deleteReport.mutateAsync(reportId)
      navigate('/reports', { replace: true })
    } catch (error) {
      setActionError(toApiError(error).message)
      setConfirmDelete(false)
    }
  }

  return (
    <AppShell title={t('reports.detail.pageTitle')}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center gap-2">
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
          {isSubmittedStatus && !linkedComplaint && (
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

        {isDraft && (
          <p className="rounded-lg bg-warning-50 px-4 py-2.5 text-sm text-warning-700">
            {t('reports.detail.draftNotice')}
          </p>
        )}

        {actionError && (
          <p role="alert" className="rounded-lg bg-danger-50 px-4 py-2.5 text-sm text-danger-700">
            {actionError}
          </p>
        )}

        <ReportOverview report={report} />

        <Reveal delay={80}>
          <h3 className="mb-3 text-base font-semibold text-neutral-900">{t('reports.detail.aiAssessmentHeading')}</h3>
          {analysisQuery.isLoading && <Skeleton className="h-40 w-full rounded-2xl" />}
          {analysisQuery.isSuccess && <AIAnalysisCard analysis={analysisQuery.data} compact />}
          {analysisNotFound && (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-6 text-center">
              <p className="text-sm text-neutral-500">{t('reports.detail.noAiAnalysis')}</p>
              {canRunAnalysis ? (
                <Button className="mt-4" size="sm" isLoading={runAnalysis.isPending} onClick={() => runAnalysis.mutate()}>
                  <Sparkles className="size-4" aria-hidden="true" />
                  {t('reports.detail.runAiAnalysis')}
                </Button>
              ) : (
                <p className="mt-2 text-xs text-neutral-400">{t('reports.detail.uploadPhotoForAi')}</p>
              )}
              <div className="mt-4">
                <AIDisclaimer />
              </div>
            </div>
          )}
          {analysisQuery.isError && !analysisNotFound && (
            <ErrorState message={t('reports.detail.aiLoadError')} onRetry={() => analysisQuery.refetch()} />
          )}
        </Reveal>

        <Reveal delay={140}>
          <h3 className="mb-3 text-base font-semibold text-neutral-900">{t('reports.detail.complaintHeading')}</h3>
          {linkedComplaint ? (
            <Link
              to={`/complaints/${linkedComplaint.id}`}
              className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-white p-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">{linkedComplaint.title}</p>
                <p className="text-xs text-neutral-500">
                  {t('reports.detail.filedOn', { date: formatDate(linkedComplaint.submitted_at, language) })}
                </p>
              </div>
              <StatusBadge status={linkedComplaint.status} />
            </Link>
          ) : (
            <p className="rounded-2xl border border-dashed border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
              {isSubmittedStatus
                ? t('reports.detail.noComplaintYet')
                : t('reports.detail.complaintNotice')}
            </p>
          )}
        </Reveal>
      </div>

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
