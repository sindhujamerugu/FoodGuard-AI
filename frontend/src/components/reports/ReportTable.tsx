import { useNavigate } from 'react-router-dom'
import { ImageOff } from 'lucide-react'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { PriorityBadge } from '@/components/badges/PriorityBadge'
import { Reveal } from '@/components/motion/Reveal'
import { formatDate } from '@/lib/format'
import type { FoodReport } from '@/types/report'

export function ReportTable({ reports, showCustomer }: { reports: FoodReport[]; showCustomer?: boolean }) {
  const navigate = useNavigate()

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-100 bg-white shadow-card">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100 text-xs uppercase tracking-wide text-neutral-400">
            <th className="px-5 py-3 font-medium">Report</th>
            <th className="px-5 py-3 font-medium">Restaurant</th>
            {showCustomer && <th className="px-5 py-3 font-medium">Customer</th>}
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Priority</th>
            <th className="px-5 py-3 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report, i) => (
            <Reveal
              key={report.id}
              as="tr"
              variant="fade"
              delay={i * 40}
              onClick={() => navigate(`${showCustomer ? '/reviewer/reports' : '/reports'}/${report.id}`)}
              className="group cursor-pointer border-b border-neutral-50 transition-colors last:border-0 hover:bg-neutral-25"
            >
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100">
                    {report.image ? (
                      <img
                        src={report.image}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    ) : (
                      <ImageOff className="size-4 text-neutral-300" aria-hidden="true" />
                    )}
                  </div>
                  <span className="max-w-56 truncate font-medium text-neutral-900">{report.title}</span>
                </div>
              </td>
              <td className="px-5 py-3 text-neutral-600">{report.restaurant.name}</td>
              {showCustomer && (
                <td className="px-5 py-3 text-neutral-600">
                  {report.customer.first_name} {report.customer.last_name}
                </td>
              )}
              <td className="px-5 py-3">
                <StatusBadge status={report.status} />
              </td>
              <td className="px-5 py-3">
                <PriorityBadge priority={report.priority} />
              </td>
              <td className="px-5 py-3 whitespace-nowrap text-neutral-500">{formatDate(report.created_at)}</td>
            </Reveal>
          ))}
        </tbody>
      </table>
    </div>
  )
}
