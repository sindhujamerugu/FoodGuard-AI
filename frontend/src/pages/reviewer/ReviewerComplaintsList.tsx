import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  RotateCcw,
  Search,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { PriorityBadge } from '@/components/badges/PriorityBadge'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { TableSkeleton } from '@/components/states/LoadingSkeleton'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Reveal } from '@/components/motion/Reveal'
import { useComplaints } from '@/hooks/useComplaints'
import { formatDate } from '@/lib/format'
import { COMPLAINT_CATEGORY_LABELS } from '@/types/complaint'
import type { ComplaintCategory, ComplaintPriority, ComplaintStatus } from '@/types/complaint'

const STATUS_OPTIONS: Array<{ label: string; value: ComplaintStatus | 'ALL' }> = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Under Review', value: 'UNDER_REVIEW' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
]

const PRIORITY_OPTIONS: Array<{ label: string; value: ComplaintPriority | 'ALL' }> = [
  { label: 'All Priorities', value: 'ALL' },
  { label: 'Critical', value: 'CRITICAL' },
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
]

const CATEGORY_OPTIONS: Array<{ label: string; value: ComplaintCategory | 'ALL' }> = [
  { label: 'All Categories', value: 'ALL' },
  { label: 'Food Quality', value: 'FOOD_QUALITY' },
  { label: 'Spoilage', value: 'SPOILAGE' },
  { label: 'Foreign Object', value: 'FOREIGN_OBJECT' },
  { label: 'Hygiene', value: 'HYGIENE' },
  { label: 'Taste or Odor', value: 'TASTE_OR_ODOR' },
  { label: 'Other', value: 'OTHER' },
]

export default function ReviewerComplaintsList() {
  const navigate = useNavigate()
  const { data, isLoading, isError, isSuccess, refetch } = useComplaints()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ComplaintStatus | 'ALL'>('ALL')
  const [priority, setPriority] = useState<ComplaintPriority | 'ALL'>('ALL')
  const [category, setCategory] = useState<ComplaintCategory | 'ALL'>('ALL')

  const complaints = useMemo(() => data ?? [], [data])

  // Metrics
  const activeCount = useMemo(
    () => complaints.filter((c) => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW').length,
    [complaints],
  )
  const highPriorityCount = useMemo(
    () => complaints.filter((c) => c.priority === 'HIGH' || c.priority === 'CRITICAL').length,
    [complaints],
  )
  const resolvedCount = useMemo(
    () => complaints.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length,
    [complaints],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return complaints.filter((c) => {
      const matchesStatus = status === 'ALL' || c.status === status
      const matchesPriority = priority === 'ALL' || c.priority === priority
      const matchesCategory = category === 'ALL' || c.category === category
      const matchesSearch =
        !term ||
        c.title.toLowerCase().includes(term) ||
        c.restaurant.name.toLowerCase().includes(term) ||
        `${c.customer.first_name} ${c.customer.last_name}`.toLowerCase().includes(term) ||
        String(c.id).includes(term)

      return matchesStatus && matchesPriority && matchesCategory && matchesSearch
    })
  }, [complaints, search, status, priority, category])

  function resetFilters() {
    setSearch('')
    setStatus('ALL')
    setPriority('ALL')
    setCategory('ALL')
  }

  const hasActiveFilters = search || status !== 'ALL' || priority !== 'ALL' || category !== 'ALL'

  return (
    <AppShell title="Complaint Queue">
      {/* Page Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-rose-600" />
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
              Complaint Queue
            </h1>
          </div>
          <p className="mt-1 text-sm text-neutral-600">
            Triage, investigate, and resolve formal customer food safety complaints.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/reviewer/reports">
            <Button variant="outline" size="sm" className="text-xs">
              View Reports Queue
            </Button>
          </Link>
          <Link to="/reviewer">
            <Button variant="outline" size="sm" className="text-xs">
              Dashboard Overview
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Ticker Row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-card">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            Active / Needing Review
          </span>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-card">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            High & Critical Priority
          </span>
          <p className="mt-1 text-2xl font-bold text-danger-700">{highPriorityCount}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-card">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            Resolved / Concluded
          </span>
          <p className="mt-1 text-2xl font-bold text-success-700">{resolvedCount}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-card">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            Total Filed Records
          </span>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{complaints.length}</p>
        </div>
      </div>

      {/* Operational Filter Toolbar */}
      <div className="mb-5 rounded-2xl border border-neutral-200 bg-white p-4 shadow-card space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          {/* Search */}
          <div className="relative sm:col-span-4">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <Input
              placeholder="Search by title, restaurant, customer, or ID..."
              className="pl-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <div className="sm:col-span-3">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as ComplaintStatus | 'ALL')}
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Priority filter */}
          <div className="sm:col-span-2">
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as ComplaintPriority | 'ALL')}
              aria-label="Filter by priority"
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Category filter */}
          <div className="sm:col-span-3">
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as ComplaintCategory | 'ALL')}
              aria-label="Filter by category"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs text-neutral-500">
            <span>
              Showing {filtered.length} of {complaints.length} complaints
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 font-medium text-primary-700 hover:underline"
            >
              <RotateCcw className="size-3" /> Reset all filters
            </button>
          </div>
        )}
      </div>

      {isLoading && <TableSkeleton rows={6} />}
      {isError && (
        <ErrorState message="Could not load complaints queue." onRetry={() => refetch()} />
      )}

      {isSuccess && filtered.length === 0 && (
        <EmptyState
          title="No complaints matching your criteria"
          description={
            hasActiveFilters
              ? 'Try widening your filters or resetting the search term.'
              : 'There are currently no customer complaints filed in the system.'
          }
          action={
            hasActiveFilters ? (
              <Button size="sm" variant="outline" onClick={resetFilters}>
                Clear Filters
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Case List Table */}
      {filtered.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-card">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-25 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <th className="px-5 py-3.5">Case Reference & Title</th>
                <th className="px-5 py-3.5">Establishment</th>
                <th className="px-5 py-3.5">Complainant</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Priority</th>
                <th className="px-5 py-3.5">Filed</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((c, i) => (
                <Reveal
                  key={c.id}
                  as="tr"
                  variant="fade"
                  delay={i * 25}
                  onClick={() => navigate(`/reviewer/complaints/${c.id}`)}
                  className="group cursor-pointer transition-colors hover:bg-neutral-25"
                >
                  {/* Case Ref & Title */}
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded">
                          #CMP-{c.id}
                        </span>
                        <span className="rounded bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-600 border border-neutral-200">
                          {COMPLAINT_CATEGORY_LABELS[c.category] ?? c.category}
                        </span>
                      </div>
                      <p className="max-w-xs font-semibold text-neutral-900 group-hover:text-primary-800 line-clamp-1">
                        {c.title}
                      </p>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        Linked Report #{c.food_report.id}
                      </span>
                    </div>
                  </td>

                  {/* Establishment */}
                  <td className="px-5 py-4">
                    <div className="text-xs">
                      <p className="font-semibold text-neutral-900">{c.restaurant.name}</p>
                      <p className="text-neutral-500">{c.restaurant.city}</p>
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="px-5 py-4">
                    <div className="text-xs">
                      <p className="font-medium text-neutral-800">
                        {c.customer.first_name} {c.customer.last_name}
                      </p>
                      <p className="text-neutral-400 truncate max-w-40">{c.customer.email}</p>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <StatusBadge status={c.status} />
                  </td>

                  {/* Priority Badge */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <PriorityBadge priority={c.priority} />
                  </td>

                  {/* Submitted Date */}
                  <td className="px-5 py-4 whitespace-nowrap text-xs text-neutral-500 font-mono">
                    {formatDate(c.submitted_at)}
                  </td>

                  {/* Open Case Action */}
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <Button
                      size="sm"
                      className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs group-hover:bg-primary-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/reviewer/complaints/${c.id}`)
                      }}
                    >
                      Open Case
                      <ArrowRight className="size-3.5 ml-1" />
                    </Button>
                  </td>
                </Reveal>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  )
}
