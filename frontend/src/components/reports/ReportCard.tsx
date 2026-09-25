import { Link } from 'react-router-dom'
import { ImageOff } from 'lucide-react'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { PriorityBadge } from '@/components/badges/PriorityBadge'
import { formatDate } from '@/lib/format'
import type { FoodReport } from '@/types/report'

export function ReportCard({ report }: { report: FoodReport }) {
  return (
    <Link
      to={`/reports/${report.id}`}
      className="group flex gap-4 rounded-2xl border border-neutral-100 bg-white p-4 shadow-card transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
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
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-neutral-900">{report.title}</h3>
          <StatusBadge status={report.status} className="shrink-0" />
        </div>
        <p className="mt-1 truncate text-sm text-neutral-500">
          {report.restaurant.name} · {report.restaurant.city}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <PriorityBadge priority={report.priority} />
          <span className="text-xs text-neutral-400">{formatDate(report.created_at)}</span>
        </div>
      </div>
    </Link>
  )
}
