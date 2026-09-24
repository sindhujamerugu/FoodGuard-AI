import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { ComplaintTable } from '@/components/complaints/ComplaintTable'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { TableSkeleton } from '@/components/states/LoadingSkeleton'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useComplaints } from '@/hooks/useComplaints'
import type { ComplaintStatus } from '@/types/complaint'

const STATUS_OPTIONS: Array<{ label: string; value: ComplaintStatus | 'ALL' }> = [
  { label: 'All statuses', value: 'ALL' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Under Review', value: 'UNDER_REVIEW' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
]

export default function ReviewerComplaintsList() {
  const { data, isLoading, isError, isSuccess, refetch } = useComplaints()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ComplaintStatus | 'ALL'>('ALL')

  const filtered = useMemo(() => {
    const all = data ?? []
    const term = search.trim().toLowerCase()
    return all.filter((c) => {
      const matchesStatus = status === 'ALL' || c.status === status
      const matchesSearch =
        !term ||
        c.title.toLowerCase().includes(term) ||
        c.restaurant.name.toLowerCase().includes(term) ||
        `${c.customer.first_name} ${c.customer.last_name}`.toLowerCase().includes(term)
      return matchesStatus && matchesSearch
    })
  }, [data, search, status])

  return (
    <AppShell title="Complaints">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-neutral-900">Complaint queue</h2>
        <p className="mt-1 text-sm text-neutral-500">Manage the lifecycle of every complaint filed on the platform.</p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <Input
            placeholder="Search by title, restaurant, or customer"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="sm:w-56">
          <Select value={status} onChange={(e) => setStatus(e.target.value as ComplaintStatus | 'ALL')} aria-label="Filter by status">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading && <TableSkeleton rows={6} />}
      {isError && <ErrorState message="We couldn't load complaints." onRetry={() => refetch()} />}
      {isSuccess && filtered.length === 0 && (
        <EmptyState title="No matching complaints" description="Try adjusting your search or filters." />
      )}
      {filtered.length > 0 && <ComplaintTable complaints={filtered} showCustomer />}
    </AppShell>
  )
}
