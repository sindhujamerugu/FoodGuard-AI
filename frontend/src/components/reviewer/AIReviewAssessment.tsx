import { AlertCircle, AlertTriangle, CheckCircle, Info, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfidenceBar } from '@/components/ai/ConfidenceBar'
import { ConcernChip } from '@/components/ai/ConcernChip'
import { AIDisclaimer } from '@/components/ai/AIDisclaimer'
import { formatDateTime } from '@/lib/format'
import type { AIAnalysis, RiskLevel } from '@/types/aiAnalysis'

interface AIReviewAssessmentProps {
  analysis?: AIAnalysis | null
  isLoading?: boolean
  isNotFound?: boolean
  hasImage?: boolean
  isRunning?: boolean
  onRunAnalysis?: () => void
}

function RiskBanner({ risk }: { risk: RiskLevel }) {
  switch (risk) {
    case 'LOW':
      return (
        <div className="flex items-center justify-between rounded-xl border border-success-200 bg-success-50/70 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="size-5 text-success-600 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-success-800">
                Low Visible Risk
              </p>
              <p className="text-xs text-success-700">No major visible food safety anomalies detected.</p>
            </div>
          </div>
          <span className="rounded-md bg-success-100 px-2.5 py-1 text-xs font-semibold text-success-800">
            LOW
          </span>
        </div>
      )
    case 'MEDIUM':
      return (
        <div className="flex items-center justify-between rounded-xl border border-warning-200 bg-warning-50/70 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="size-5 text-warning-600 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-warning-800">
                Medium Visible Risk
              </p>
              <p className="text-xs text-warning-700">Possible irregularities detected requiring reviewer review.</p>
            </div>
          </div>
          <span className="rounded-md bg-warning-100 px-2.5 py-1 text-xs font-semibold text-warning-800">
            MEDIUM
          </span>
        </div>
      )
    case 'HIGH':
      return (
        <div className="flex items-center justify-between rounded-xl border border-danger-200 bg-danger-50/70 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="size-5 text-danger-600 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-danger-800">
                High Visible Concern
              </p>
              <p className="text-xs text-danger-700">Visual indicators strongly suggest contamination or spoilage.</p>
            </div>
          </div>
          <span className="rounded-md bg-danger-100 px-2.5 py-1 text-xs font-semibold text-danger-800">
            HIGH
          </span>
        </div>
      )
    case 'HUMAN_REVIEW':
    default:
      return (
        <div className="flex items-center justify-between rounded-xl border border-neutral-300 bg-neutral-100/70 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Info className="size-5 text-neutral-600 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-800">
                Human Review Required
              </p>
              <p className="text-xs text-neutral-600">Model uncertainty requires prioritized human evaluation.</p>
            </div>
          </div>
          <span className="rounded-md bg-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-800">
            REVIEW
          </span>
        </div>
      )
  }
}

export function AIReviewAssessment({
  analysis,
  isLoading,
  isNotFound,
  hasImage,
  isRunning,
  onRunAnalysis,
}: AIReviewAssessmentProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card space-y-4 animate-pulse">
        <div className="h-5 w-48 rounded bg-neutral-200" />
        <div className="h-16 w-full rounded-xl bg-neutral-100" />
        <div className="h-8 w-full rounded-xl bg-neutral-100" />
      </div>
    )
  }

  if (isNotFound || !analysis) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary-700" aria-hidden="true" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-900">
              AI Visual Assessment
            </h3>
          </div>
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600">
            Pending Assessment
          </span>
        </div>

        <div className="py-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
            <Sparkles className="size-6" />
          </div>
          <h4 className="mt-3 text-sm font-medium text-neutral-900">
            No Automated Assessment Generated Yet
          </h4>
          <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
            {hasImage
              ? 'An evidence photograph is attached to this case. Run computer vision screening to assess visible spoilage or foreign objects.'
              : 'No evidence photograph was uploaded with this report for visual screening.'}
          </p>

          {hasImage && onRunAnalysis && (
            <Button
              className="mt-4"
              size="sm"
              isLoading={isRunning}
              onClick={onRunAnalysis}
            >
              <Sparkles className="size-4" aria-hidden="true" />
              Run Visual Screening
            </Button>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-neutral-100">
          <AIDisclaimer />
        </div>
      </div>
    )
  }

  const confidencePct = Math.round(Number.parseFloat(analysis.confidence || '0') * 100)

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card space-y-5">
      {/* Header with clear "Preliminary visual assessment" label */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary-700" aria-hidden="true" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-900">
            AI Visual Assessment
          </h3>
        </div>
        <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-800 border border-primary-200">
          Preliminary Visual Assessment
        </span>
      </div>

      {/* Prominent advisory notice */}
      <div className="rounded-lg bg-neutral-50 p-2.5 text-xs text-neutral-600 flex items-start gap-2 border border-neutral-200">
        <Info className="size-4 text-neutral-500 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="leading-snug">
          <strong className="font-semibold text-neutral-800">Reviewer Notice:</strong> This is a
          preliminary algorithmic visual screening. It is strictly non-binding and does not constitute
          laboratory certification or a final safety determination.
        </p>
      </div>

      {/* Risk level banner */}
      <RiskBanner risk={analysis.risk} />

      {/* Confidence gauge */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-neutral-600">Model Confidence</span>
          <span className="font-mono font-semibold text-neutral-900">{confidencePct}%</span>
        </div>
        <ConfidenceBar confidence={analysis.confidence} />
      </div>

      {/* Visual Concerns / Predictions */}
      {analysis.concerns && analysis.concerns.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Flagged Visible Anomaly Categories
          </p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.concerns.map((concern) => (
              <ConcernChip key={concern} concern={concern} />
            ))}
          </div>
        </div>
      )}

      {/* Analysis message narrative */}
      {analysis.message && (
        <div className="rounded-xl bg-neutral-50 p-3.5 text-xs leading-relaxed text-neutral-700 border border-neutral-100">
          <p className="font-semibold text-neutral-800 mb-1">Visual Observations:</p>
          <p>{analysis.message}</p>
        </div>
      )}

      {/* Model metadata & Analyzed timestamp */}
      <div className="rounded-lg border border-neutral-100 bg-neutral-25 px-3 py-2 text-[11px] text-neutral-500 flex flex-wrap items-center justify-between gap-2">
        <span>
          <strong className="font-medium text-neutral-700">Model:</strong> {analysis.model_name} (v{analysis.model_version})
        </span>
        {analysis.analyzed_at && (
          <span>
            <strong className="font-medium text-neutral-700">Screened:</strong> {formatDateTime(analysis.analyzed_at)}
          </span>
        )}
      </div>

      {/* Existing standard disclaimer */}
      <AIDisclaimer />
    </div>
  )
}
