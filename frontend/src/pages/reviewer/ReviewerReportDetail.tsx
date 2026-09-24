import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { ReportOverview } from '@/components/reports/ReportOverview'
import { AIAnalysisCard } from '@/components/ai/AIAnalysisCard'
import { AIDisclaimer } from '@/components/ai/AIDisclaimer'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/LoadingSkeleton'
import { useReport } from '@/hooks/useReports'
import { useAIAnalysis, useRunAIAnalysis } from '@/hooks/useAIAnalysis'

export default function ReviewerReportDetail() {
  const { id } = useParams<{ id: string }>()
  const reportId = Number(id)

  const { data: report, isLoading, isError, refetch } = useReport(reportId)
  const analysisQuery = useAIAnalysis(reportId)
  const runAnalysis = useRunAIAnalysis(reportId)
  const analysisNotFound = axios.isAxiosError(analysisQuery.error) && analysisQuery.error.response?.status === 404

  if (isLoading) {
    return (
      <AppShell title="Report Review">
        <Skeleton className="mx-auto h-96 w-full max-w-3xl rounded-2xl" />
      </AppShell>
    )
  }

  if (isError || !report) {
    return (
      <AppShell title="Report Review">
        <ErrorState message="We couldn't load this report." onRetry={() => refetch()} />
      </AppShell>
    )
  }

  return (
    <AppShell title="Report Review">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link to="/reviewer/reports" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to reports
        </Link>

        <ReportOverview report={report} showCustomer />

        <div>
          <h3 className="mb-3 text-base font-semibold text-neutral-900">AI Assessment</h3>
          {analysisQuery.isLoading && <Skeleton className="h-40 w-full rounded-2xl" />}
          {analysisQuery.isSuccess && <AIAnalysisCard analysis={analysisQuery.data} />}
          {analysisNotFound && (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-6 text-center">
              <p className="text-sm text-neutral-500">No AI analysis has been run for this report yet.</p>
              {report.image ? (
                <Button className="mt-4" size="sm" isLoading={runAnalysis.isPending} onClick={() => runAnalysis.mutate()}>
                  <Sparkles className="size-4" aria-hidden="true" />
                  Run AI Analysis
                </Button>
              ) : (
                <p className="mt-2 text-xs text-neutral-400">This report has no evidence photo.</p>
              )}
              <div className="mt-4">
                <AIDisclaimer />
              </div>
            </div>
          )}
          {analysisQuery.isError && !analysisNotFound && (
            <ErrorState message="Couldn't load AI analysis." onRetry={() => analysisQuery.refetch()} />
          )}
        </div>
      </div>
    </AppShell>
  )
}
