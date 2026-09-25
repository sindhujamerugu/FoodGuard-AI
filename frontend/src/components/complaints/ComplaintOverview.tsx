import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { PriorityBadge } from '@/components/badges/PriorityBadge'
import { Reveal } from '@/components/motion/Reveal'
import { COMPLAINT_CATEGORY_LABELS } from '@/types/complaint'
import { LinkedReportBadge } from './ComplaintTimeline'
import type { Complaint } from '@/types/complaint'

export function ComplaintOverview({ complaint, showCustomer, reportLinkBase }: { complaint: Complaint; showCustomer?: boolean; reportLinkBase: string }) {
  return (
    <Reveal as="div" className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">{complaint.title}</h2>
          <p className="mt-1 flex items-center gap-1 text-sm text-neutral-500">
            <MapPin className="size-3.5" aria-hidden="true" />
            {complaint.restaurant.name} · {complaint.restaurant.city}, {complaint.restaurant.state}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={complaint.priority} />
          <StatusBadge status={complaint.status} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-lg bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600">
          {COMPLAINT_CATEGORY_LABELS[complaint.category]}
        </span>
        <Link
          to={`${reportLinkBase}/${complaint.food_report.id}`}
          className="transition-transform duration-200 hover:-translate-y-0.5"
        >
          <LinkedReportBadge title={complaint.food_report.title} status={complaint.food_report.status} />
        </Link>
      </div>

      {showCustomer && (
        <p className="mt-3 text-sm text-neutral-500">
          Filed by {complaint.customer.first_name} {complaint.customer.last_name} ({complaint.customer.email})
        </p>
      )}

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-neutral-700">Description</h3>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">{complaint.description}</p>
      </div>

      {complaint.resolution_notes && (
        <div className="mt-5 rounded-xl bg-success-50 p-4">
          <h3 className="text-sm font-semibold text-success-800">Resolution Notes</h3>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-success-700">{complaint.resolution_notes}</p>
        </div>
      )}
    </Reveal>
  )
}
