import { ArrowLeft, Building2, Calendar, Hash } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { PriorityBadge } from '@/components/badges/PriorityBadge'
import { formatDateTime } from '@/lib/format'
import { useLanguage } from '@/i18n/LanguageContext'
import type { ComplaintPriority, ComplaintStatus } from '@/types/complaint'
import type { ReportPriority, ReportStatus } from '@/types/report'

interface CaseHeaderProps {
  reference: string
  title: string
  backTo: string
  backLabel: string
  status: ReportStatus | ComplaintStatus
  priority: ReportPriority | ComplaintPriority
  restaurantName: string
  restaurantCity: string
  submittedAt: string
  actionSlot?: React.ReactNode
}

export function CaseHeader({
  reference,
  title,
  backTo,
  backLabel,
  status,
  priority,
  restaurantName,
  restaurantCity,
  submittedAt,
  actionSlot,
}: CaseHeaderProps) {
  const { language } = useLanguage()
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={backTo}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {backLabel}
        </Link>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-mono font-medium text-neutral-700">
            <Hash className="size-3 text-neutral-400" />
            {reference}
          </span>
          <PriorityBadge priority={priority as ReportPriority} />
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-card md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
            {title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
            <span className="inline-flex items-center gap-1 font-medium text-neutral-700">
              <Building2 className="size-3.5 text-neutral-400" />
              {restaurantName} ({restaurantCity})
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5 text-neutral-400" />
              Filed {formatDateTime(submittedAt, language)}
            </span>
          </div>
        </div>

        {actionSlot && <div className="shrink-0">{actionSlot}</div>}
      </div>
    </div>
  )
}
