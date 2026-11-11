import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  Calendar,
  Hash,
  ImageOff,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { PriorityBadge } from '@/components/badges/PriorityBadge'
import { formatDate } from '@/lib/format'
import { useLanguage } from '@/i18n/LanguageContext'
import { cn } from '@/lib/cn'
import type { FoodReport } from '@/types/report'

/** Colour strip on the left edge keyed to status. */
const statusStrip: Record<string, string> = {
  DRAFT:        'bg-neutral-300',
  SUBMITTED:    'bg-info-400',
  UNDER_REVIEW: 'bg-warning-400',
  RESOLVED:     'bg-success-500',
  CLOSED:       'bg-neutral-400',
}

interface ReportCardProps {
  report: FoodReport
  /** Whether a formal complaint has been filed against this report (derived at list level). */
  hasComplaint?: boolean
  /** ID of the linked complaint, used to build the complaint link. */
  complaintId?: number
}

export function ReportCard({ report, hasComplaint = false, complaintId }: ReportCardProps) {
  const { language } = useLanguage()
  const strip = statusStrip[report.status] ?? 'bg-neutral-300'

  // AI analysis is only relevant once a report has been submitted
  const canHaveAI = report.status !== 'DRAFT'

  return (
    <Link
      to={`/reports/${report.id}`}
      className={cn(
        'group relative flex gap-0 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm',
        'transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md',
      )}
    >
      {/* Left status strip */}
      <div className={cn('w-1 shrink-0', strip)} aria-hidden="true" />

      {/* Thumbnail */}
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden bg-neutral-100 sm:size-24">
        {report.image ? (
          <img
            src={report.image}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <ImageOff className="size-6 text-neutral-300" aria-hidden="true" />
        )}
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 px-4 py-3">

        {/* Row 1: ref + status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-400">
              <Hash className="size-3" aria-hidden="true" />
              {report.id}
            </span>
            <h3 className="truncate text-sm font-semibold text-neutral-900 group-hover:text-primary-800 transition-colors">
              {report.title}
            </h3>
          </div>
          <StatusBadge status={report.status} className="mt-0.5 shrink-0" />
        </div>

        {/* Row 2: restaurant */}
        <p className="flex items-center gap-1 truncate text-xs text-neutral-500">
          <Building2 className="size-3 shrink-0" aria-hidden="true" />
          {report.restaurant.name}
          {report.restaurant.city ? ` · ${report.restaurant.city}` : ''}
        </p>

        {/* Row 3: indicator chips */}
        {(canHaveAI || hasComplaint) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {canHaveAI && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
                <Sparkles className="size-2.5" aria-hidden="true" />
                AI assessment
              </span>
            )}
            {hasComplaint && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2 py-0.5 text-[10px] font-semibold text-warning-700">
                <MessageSquare className="size-2.5" aria-hidden="true" />
                Complaint #{complaintId ?? '—'}
              </span>
            )}
          </div>
        )}

        {/* Row 4: footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PriorityBadge priority={report.priority} />
            <span className="flex items-center gap-1 text-xs text-neutral-400">
              <Calendar className="size-3" aria-hidden="true" />
              {formatDate(report.created_at, language)}
            </span>
          </div>
          <span className="hidden items-center gap-1 text-xs font-medium text-primary-600 opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:flex">
            View details <ArrowRight className="size-3" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  )
}
