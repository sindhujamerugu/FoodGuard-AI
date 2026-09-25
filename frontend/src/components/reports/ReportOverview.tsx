import { ImageOff, MapPin } from 'lucide-react'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { PriorityBadge } from '@/components/badges/PriorityBadge'
import { Reveal } from '@/components/motion/Reveal'
import { formatDateTime } from '@/lib/format'
import type { FoodReport } from '@/types/report'

export function ReportOverview({ report, showCustomer }: { report: FoodReport; showCustomer?: boolean }) {
  return (
    <Reveal as="div" className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">{report.title}</h2>
          <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
            <MapPin className="size-3.5" aria-hidden="true" />
            {report.restaurant.name} · {report.restaurant.city}, {report.restaurant.state}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={report.priority} />
          <StatusBadge status={report.status} />
        </div>
      </div>

      {showCustomer && (
        <p className="mt-3 text-sm text-neutral-500">
          Filed by {report.customer.first_name} {report.customer.last_name} ({report.customer.email})
        </p>
      )}

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
            <span className="text-sm">No image attached</span>
          </div>
        )}
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-neutral-700">Description</h3>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">{report.description}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-xs text-neutral-500">
        <span className="rounded-full bg-neutral-50 px-3 py-1">Created {formatDateTime(report.created_at)}</span>
        <span className="rounded-full bg-neutral-50 px-3 py-1">Updated {formatDateTime(report.updated_at)}</span>
      </div>
    </Reveal>
  )
}
