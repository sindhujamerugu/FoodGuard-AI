import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { PriorityBadge } from '@/components/badges/PriorityBadge'
import { COMPLAINT_CATEGORY_LABELS } from '@/types/complaint'
import { formatDate } from '@/lib/format'
import type { Complaint } from '@/types/complaint'

export function ComplaintCard({ complaint }: { complaint: Complaint }) {
  return (
    <Link
      to={`/complaints/${complaint.id}`}
      className="flex flex-col gap-2 rounded-2xl border border-neutral-100 bg-white p-4 shadow-card transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-neutral-900">{complaint.title}</h3>
        <StatusBadge status={complaint.status} className="shrink-0" />
      </div>
      <p className="truncate text-sm text-neutral-500">
        {complaint.restaurant.name} · {COMPLAINT_CATEGORY_LABELS[complaint.category]}
      </p>
      <div className="flex items-center gap-2">
        <PriorityBadge priority={complaint.priority} />
        <span className="text-xs text-neutral-400">{formatDate(complaint.submitted_at)}</span>
      </div>
    </Link>
  )
}
