import { AlertCircle, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { RiskLevel } from '@/types/aiAnalysis'

const config: Record<RiskLevel, { label: string; classes: string; Icon: typeof AlertCircle }> = {
  LOW: { label: 'Low Risk', classes: 'bg-success-50 text-success-700 border-success-100', Icon: CheckCircle2 },
  MEDIUM: { label: 'Medium Risk', classes: 'bg-warning-50 text-warning-700 border-warning-100', Icon: AlertTriangle },
  HIGH: { label: 'High Risk', classes: 'bg-danger-50 text-danger-700 border-danger-100', Icon: AlertCircle },
  HUMAN_REVIEW: {
    label: 'Human Review Required',
    classes: 'bg-neutral-100 text-neutral-700 border-neutral-200',
    Icon: HelpCircle,
  },
}

export function RiskIndicator({ risk }: { risk: RiskLevel }) {
  const { label, classes, Icon } = config[risk]
  return (
    <div className={cn('flex items-center gap-2.5 rounded-xl border px-4 py-3', classes)}>
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  )
}
