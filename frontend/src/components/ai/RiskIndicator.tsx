import { AlertCircle, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useTranslation } from '@/i18n/LanguageContext'
import type { TranslationKey } from '@/i18n/en'
import type { RiskLevel } from '@/types/aiAnalysis'

const config: Record<RiskLevel, { classes: string; Icon: typeof AlertCircle }> = {
  LOW: { classes: 'bg-success-50 text-success-700 border-success-100', Icon: CheckCircle2 },
  MEDIUM: { classes: 'bg-warning-50 text-warning-700 border-warning-100', Icon: AlertTriangle },
  HIGH: { classes: 'bg-danger-50 text-danger-700 border-danger-100', Icon: AlertCircle },
  HUMAN_REVIEW: {
    classes: 'bg-neutral-100 text-neutral-700 border-neutral-200',
    Icon: HelpCircle,
  },
}

const riskKeys: Record<RiskLevel, TranslationKey> = {
  LOW: 'risk.low',
  MEDIUM: 'risk.medium',
  HIGH: 'risk.high',
  HUMAN_REVIEW: 'risk.humanReview',
}

const emphasize: Record<RiskLevel, boolean> = {
  LOW: false,
  MEDIUM: false,
  HIGH: true,
  HUMAN_REVIEW: true,
}

export function RiskIndicator({ risk }: { risk: RiskLevel }) {
  const t = useTranslation()
  const cfg = config[risk] ?? config.HUMAN_REVIEW
  const Icon = cfg.Icon
  const key = riskKeys[risk]
  const label = key ? t(key) : risk

  return (
    <div className={cn('flex items-center gap-2.5 rounded-xl border px-4 py-3 transition-colors duration-300', cfg.classes)}>
      <Icon
        className={cn('size-5 shrink-0', (emphasize[risk] ?? true) && 'motion-safe:animate-pulse')}
        aria-hidden="true"
      />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  )
}
