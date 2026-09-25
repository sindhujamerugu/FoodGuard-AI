import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { PriorityBadge } from '@/components/badges/PriorityBadge'
import { Reveal } from '@/components/motion/Reveal'
import { COMPLAINT_CATEGORY_LABELS } from '@/types/complaint'
import { formatDate } from '@/lib/format'
import type { Complaint } from '@/types/complaint'

export function ComplaintTable({ complaints, showCustomer }: { complaints: Complaint[]; showCustomer?: boolean }) {
  const navigate = useNavigate()
  const base = showCustomer ? '/reviewer/complaints' : '/complaints'

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-100 bg-white shadow-card">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100 text-xs uppercase tracking-wide text-neutral-400">
            <th className="px-5 py-3 font-medium">Complaint</th>
            <th className="px-5 py-3 font-medium">Restaurant</th>
            {showCustomer && <th className="px-5 py-3 font-medium">Customer</th>}
            <th className="px-5 py-3 font-medium">Category</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Priority</th>
            <th className="px-5 py-3 font-medium">Filed</th>
          </tr>
        </thead>
        <tbody>
          {complaints.map((complaint, i) => (
            <Reveal
              key={complaint.id}
              as="tr"
              variant="fade"
              delay={i * 40}
              onClick={() => navigate(`${base}/${complaint.id}`)}
              className="cursor-pointer border-b border-neutral-50 transition-colors last:border-0 hover:bg-neutral-25"
            >
              <td className="max-w-56 truncate px-5 py-3 font-medium text-neutral-900">{complaint.title}</td>
              <td className="px-5 py-3 text-neutral-600">{complaint.restaurant.name}</td>
              {showCustomer && (
                <td className="px-5 py-3 text-neutral-600">
                  {complaint.customer.first_name} {complaint.customer.last_name}
                </td>
              )}
              <td className="px-5 py-3 text-neutral-600">{COMPLAINT_CATEGORY_LABELS[complaint.category]}</td>
              <td className="px-5 py-3">
                <StatusBadge status={complaint.status} />
              </td>
              <td className="px-5 py-3">
                <PriorityBadge priority={complaint.priority} />
              </td>
              <td className="px-5 py-3 whitespace-nowrap text-neutral-500">{formatDate(complaint.submitted_at)}</td>
            </Reveal>
          ))}
        </tbody>
      </table>
    </div>
  )
}
