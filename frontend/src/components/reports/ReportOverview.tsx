import { Building2, Calendar, ImageOff, Navigation } from 'lucide-react'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { PriorityBadge } from '@/components/badges/PriorityBadge'
import { formatDateTime } from '@/lib/format'
import { useLanguage } from '@/i18n/LanguageContext'
import type { FoodReport } from '@/types/report'

interface ReportOverviewProps {
  report: FoodReport
  showCustomer?: boolean
}

export function ReportOverview({ report, showCustomer }: ReportOverviewProps) {
  const { language } = useLanguage()

  // Read structured location columns (never parse description)
  const hasLocation = report.location_lat != null && report.location_lng != null
  const lat = hasLocation ? Number(report.location_lat).toFixed(6) : null
  const lng = hasLocation ? Number(report.location_lng).toFixed(6) : null

  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">

      {/* Header: title + badges */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-neutral-900">{report.title}</h2>
          <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
            <Building2 className="size-3.5 shrink-0" aria-hidden="true" />
            {report.restaurant.name}
            {report.restaurant.city && ` · ${report.restaurant.city}`}
            {report.restaurant.state && `, ${report.restaurant.state}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <PriorityBadge priority={report.priority} />
          <StatusBadge status={report.status} />
        </div>
      </div>

      {/* Customer info (reviewer view) */}
      {showCustomer && (
        <p className="mt-3 text-sm text-neutral-500">
          Filed by {report.customer.first_name} {report.customer.last_name} ({report.customer.email})
        </p>
      )}

      {/* Evidence photograph */}
      <div className="group mt-5 flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-neutral-100 sm:aspect-[16/8]">
        {report.image ? (
          <img
            src={report.image}
            alt={`Evidence for ${report.title}`}
            className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-neutral-400">
            <ImageOff className="size-8" aria-hidden="true" />
            <span className="text-sm">No photograph attached</span>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="mt-5">
        <h3 className="text-sm font-semibold text-neutral-700">Description</h3>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">
          {report.description}
        </p>
      </div>

      {/* Location — only shown when structured columns are present (never parsed from description) */}
      {hasLocation && (
        <div className="mt-5 rounded-xl border border-primary-100 bg-primary-50/60 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary-900">
            <Navigation className="size-4" aria-hidden="true" />
            Location captured from browser
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-white p-2.5 shadow-sm">
              <p className="text-xs text-neutral-500">Latitude</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-neutral-900">{lat}</p>
            </div>
            <div className="rounded-lg bg-white p-2.5 shadow-sm">
              <p className="text-xs text-neutral-500">Longitude</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-neutral-900">{lng}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-primary-600">
            Coordinates were provided by the customer's device GPS/network — not derived from the photograph.
          </p>
        </div>
      )}

      {/* Timestamps */}
      <div className="mt-5 flex flex-wrap gap-2 text-xs text-neutral-500">
        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-50 px-3 py-1">
          <Calendar className="size-3" aria-hidden="true" />
          Created {formatDateTime(report.created_at, language)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-50 px-3 py-1">
          <Calendar className="size-3" aria-hidden="true" />
          Updated {formatDateTime(report.updated_at, language)}
        </span>
      </div>
    </div>
  )
}
