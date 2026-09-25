import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, RefreshCw, Sparkles } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AIAnalysisCard } from '@/components/ai/AIAnalysisCard'
import { AIDisclaimer } from '@/components/ai/AIDisclaimer'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/LoadingSkeleton'
import { useReport } from '@/hooks/useReports'
import { useAIAnalysis, useRunAIAnalysis } from '@/hooks/useAIAnalysis'
import { toApiError } from '@/types/errors'
import { useState } from 'react'

export default function ReportAIAnalysis() {
  const { id } = useParams<{ id: string }>()
  const reportId = Number(id)

  const reportQuery = useReport(reportId)
  const analysisQuery = useAIAnalysis(reportId)
  const runAnalysis = useRunAIAnalysis(reportId)
  const [runError, setRunError] = useState<string | null>(null)

  const analysisNotFound = axios.isAxiosError(analysisQuery.error) && analysisQuery.error.response?.status === 404
  const report = reportQuery.data

  async function handleRun() {
    setRunError(null)
    try {
      await runAnalysis.mutateAsync()
    } catch (error) {
      setRunError(toApiError(error).message)
    }
  }

  return (
    <AppShell title="AI Assessment">
      <div className="mx-auto max-w-2xl space-y-5">
        <Link to={`/reports/${reportId}`} className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to report
        </Link>

        {reportQuery.isLoading && <Skeleton className="h-8 w-1/2" />}
        {report && (
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">{report.title}</h2>
            <p className="mt-1 text-sm text-neutral-500">{report.restaurant.name}</p>
          </div>
        )}

        {runError && (
          <p role="alert" className="rounded-lg bg-danger-50 px-4 py-2.5 text-sm text-danger-700">
            {runError}
          </p>
        )}

        {analysisQuery.isLoading && <Skeleton className="h-64 w-full rounded-2xl" />}

        {analysisQuery.isSuccess && (
          <>
            <AIAnalysisCard analysis={analysisQuery.data} />
            <Button variant="outline" isLoading={runAnalysis.isPending} onClick={handleRun}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Re-run Analysis
            </Button>
          </>
        )}

        {analysisNotFound && (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-10 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
              <Sparkles className="size-6" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-neutral-900">No assessment yet</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-neutral-500">
              Run a preliminary AI visual assessment on this report's evidence photo.
            </p>
            {report?.image ? (
              <Button className="mt-5" isLoading={runAnalysis.isPending} onClick={handleRun}>
                <Sparkles className="size-4" aria-hidden="true" />
                Run AI Analysis
              </Button>
            ) : (
              <p className="mt-4 text-xs text-neutral-400">This report has no evidence photo attached yet.</p>
            )}
            <div className="mx-auto mt-6 max-w-md">
              <AIDisclaimer />
            </div>
          </div>
        )}

        {analysisQuery.isError && !analysisNotFound && (
          <ErrorState message="Couldn't load AI analysis." onRetry={() => analysisQuery.refetch()} />
        )}
      </div>
    </AppShell>
  )
}
