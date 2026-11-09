import { Navigate, useParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/LoadingSkeleton'
import { useReport } from '@/hooks/useReports'
import { useTranslation } from '@/i18n/LanguageContext'
import { ReportForm } from './ReportForm'

export default function ReportEdit() {
  const { id } = useParams<{ id: string }>()
  const reportId = Number(id)
  const t = useTranslation()
  const { data: report, isLoading, isError, refetch } = useReport(reportId)

  if (isLoading) {
    return (
      <AppShell title={t('reports.form.editReport')}>
        <div className="mx-auto max-w-2xl space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      </AppShell>
    )
  }

  if (isError || !report) {
    return (
      <AppShell title={t('reports.form.editReport')}>
        <ErrorState message={t('reports.detail.loadError')} onRetry={() => refetch()} />
      </AppShell>
    )
  }

  if (report.status !== 'DRAFT') {
    return <Navigate to={`/reports/${report.id}`} replace />
  }

  return <ReportForm mode="edit" existingReport={report} />
}
