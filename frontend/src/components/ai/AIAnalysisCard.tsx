import { Sparkles } from 'lucide-react'
import { RiskIndicator } from './RiskIndicator'
import { ConfidenceBar } from './ConfidenceBar'
import { ConcernChip } from './ConcernChip'
import { AIDisclaimer } from './AIDisclaimer'
import { Reveal } from '@/components/motion/Reveal'
import { formatDateTime } from '@/lib/format'
import type { AIAnalysis } from '@/types/aiAnalysis'

export function AIAnalysisCard({ analysis, compact }: { analysis: AIAnalysis; compact?: boolean }) {
  const isMock = analysis.model_name.includes('mock')

  return (
    <Reveal as="div" className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary-600" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-neutral-900">AI Visual Assessment</h3>
        </div>
        {isMock && (
          <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs font-medium text-white">
            Mock Mode
          </span>
        )}
      </div>

      <div className="space-y-4">
        <RiskIndicator risk={analysis.risk} />
        <ConfidenceBar confidence={analysis.confidence} />

        {analysis.concerns.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {analysis.concerns.map((concern) => (
              <ConcernChip key={concern} concern={concern} />
            ))}
          </div>
        )}

        {analysis.message && <p className="text-sm leading-relaxed text-neutral-600">{analysis.message}</p>}

        {!compact && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-neutral-400">
            <span>Model: {analysis.model_name} v{analysis.model_version}</span>
            <span>Analyzed: {formatDateTime(analysis.analyzed_at)}</span>
          </div>
        )}

        <AIDisclaimer />
      </div>
    </Reveal>
  )
}
