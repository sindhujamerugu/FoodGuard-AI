import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  Calendar,
  Clock,
  Hash,
  Tag,
  UtensilsCrossed,
} from 'lucide-react'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { PriorityBadge } from '@/components/badges/PriorityBadge'
import { COMPLAINT_CATEGORY_KEYS } from '@/types/complaint'
import { formatDate, formatRelative } from '@/lib/format'
import { useLanguage } from '@/i18n/LanguageContext'
import { useTranslation } from '@/i18n'
import { cn } from '@/lib/cn'
import type { Complaint } from '@/types/complaint'

/** Colour strip on left edge keyed to status — identical pattern to ReportCard */
const statusStrip: Record<string, string> = {
  SUBMITTED:    'bg-info-400',
  UNDER_REVIEW: 'bg-warning-400',
  RESOLVED:     'bg-success-500',
  CLOSED:       'bg-neutral-400',
}

export function ComplaintCard({ complaint }: { complaint: Complaint }) {
  const { language } = useLanguage()
  const { t } = useTranslation()
  const categoryKey = COMPLAINT_CATEGORY_KEYS[complaint.category]
  const strip = statusStrip[complaint.status] ?? 'bg-neutral-300'

  return (
    <Link
      to={`/complaints/${complaint.id}`}
      className={cn(
        'group relative flex gap-0 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm',
        'transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md',
      )}
    >
      {/* Left status strip */}
      <div className={cn('w-1 shrink-0', strip)} aria-hidden="true" />

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">

        {/* Row 1: ref badge + status */}
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-0.5 text-xs font-mono font-semibold text-primary-700">
            <Hash className="size-3" aria-hidden="true" />
            {complaint.id}
          </span>
          <StatusBadge status={complaint.status} className="shrink-0" />
        </div>

        {/* Row 2: title */}
        <h3 className="truncate text-sm font-semibold text-neutral-900 group-hover:text-primary-800 transition-colors">
          {complaint.title}
        </h3>

        {/* Row 3: food item from linked report */}
        <div className="flex items-center gap-1 truncate text-xs text-neutral-500">
          <UtensilsCrossed className="size-3 shrink-0 text-neutral-400" aria-hidden="true" />
          <span className="truncate">{complaint.food_report.title}</span>
        </div>

        {/* Row 4: restaurant */}
        <div className="flex items-center gap-1 truncate text-xs text-neutral-500">
          <Building2 className="size-3 shrink-0 text-neutral-400" aria-hidden="true" />
          <span className="truncate">
            {complaint.restaurant.name}
            {complaint.restaurant.city ? ` · ${complaint.restaurant.city}` : ''}
          </span>
        </div>

        {/* Row 5: category chip */}
        <div className="flex items-center gap-1 text-xs text-neutral-500">
          <Tag className="size-3 shrink-0 text-neutral-400" aria-hidden="true" />
          <span>{categoryKey ? t(categoryKey) : complaint.category}</span>
        </div>

        {/* Row 6: footer — priority + dates + arrow */}
        <div className="flex items-center justify-between gap-2 border-t border-neutral-50 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={complaint.priority} />
            <span className="flex items-center gap-1 text-xs text-neutral-400">
              <Calendar className="size-3" aria-hidden="true" />
              {formatDate(complaint.submitted_at, language)}
            </span>
            {complaint.updated_at !== complaint.submitted_at && (
              <span className="flex items-center gap-1 text-xs text-neutral-400">
                <Clock className="size-3" aria-hidden="true" />
                {formatRelative(complaint.updated_at, language)}
              </span>
            )}
          </div>
          <span
            className="hidden items-center gap-1 text-xs font-medium text-primary-600 opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:flex"
          >
            View <ArrowRight className="size-3" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  )
}
