import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Camera,
  ImageOff,
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
import { useReports } from '@/hooks/useReports'
import { formatDate } from '@/lib/format'
import type { ReportPriority, ReportStatus } from '@/types/report'

const STATUS_OPTIONS: Array<{ label: string; value: ReportStatus | 'ALL' }> = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Under Review', value: 'UNDER_REVIEW' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
]

const PRIORITY_OPTIONS: Array<{ label: string; value: ReportPriority | 'ALL' }> = [
  { label: 'All Priorities', value: 'ALL' },
  { label: 'Critical', value: 'CRITICAL' },
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
]

const EVIDENCE_OPTIONS: Array<{ label: string; value: 'ALL' | 'WITH_IMAGE' | 'NO_IMAGE' }> = [
  { label: 'All Evidence Types', value: 'ALL' },
  { label: 'With Photo Evidence', value: 'WITH_IMAGE' },
  { label: 'Without Photo Evidence', value: 'NO_IMAGE' },
]

export default function ReviewerReportsList() {
  const navigate = useNavigate()
  const { data, isLoading, isError, isSuccess, refetch } = useReports()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ReportStatus | 'ALL'>('ALL')
  const [priority, setPriority] = useState<ReportPriority | 'ALL'>('ALL')
  const [evidenceFilter, setEvidenceFilter] = useState<'ALL' | 'WITH_IMAGE' | 'NO_IMAGE'>('ALL')

  const reports = useMemo(() => data ?? [], [data])

  // Metrics
  const needingAttentionCount = useMemo(
    () => reports.filter((r) => r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW').length,
    [reports],
  )
  const highPriorityCount = useMemo(
    () => reports.filter((r) => r.priority === 'HIGH' || r.priority === 'CRITICAL').length,
    [reports],
  )
  const withImageCount = useMemo(() => reports.filter((r) => Boolean(r.image)).length, [reports])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return reports.filter((r) => {
      const matchesStatus = status === 'ALL' || r.status === status
      const matchesPriority = priority === 'ALL' || r.priority === priority
      const matchesEvidence =
        evidenceFilter === 'ALL' ||
        (evidenceFilter === 'WITH_IMAGE' && Boolean(r.image)) ||
        (evidenceFilter === 'NO_IMAGE' && !r.image)

      const matchesSearch =
        !term ||
        r.title.toLowerCase().includes(term) ||
        r.restaurant.name.toLowerCase().includes(term) ||
        `${r.customer.first_name} ${r.customer.last_name}`.toLowerCase().includes(term) ||
        String(r.id).includes(term)

      return matchesStatus && matchesPriority && matchesEvidence && matchesSearch
    })
  }, [reports, search, status, priority, evidenceFilter])

  function resetFilters() {
    setSearch('')
    setStatus('ALL')
    setPriority('ALL')
    setEvidenceFilter('ALL')
  }

  const hasActiveFilters =
    search || status !== 'ALL' || priority !== 'ALL' || evidenceFilter !== 'ALL'

  return (
    <AppShell title="Reports Queue">
      {/* Page Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary-600" />
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
              Food Safety Reports Queue
            </h1>
          </div>
          <p className="mt-1 text-sm text-neutral-600">
            Investigate submitted incidents, review photographic evidence, and verify safety violations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/reviewer/complaints">
            <Button variant="outline" size="sm" className="text-xs">
              View Complaints Queue
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
            Needing Attention
          </span>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{needingAttentionCount}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-card">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            High & Critical Priority
          </span>
          <p className="mt-1 text-2xl font-bold text-danger-700">{highPriorityCount}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-card">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            Photo Evidence Attached
          </span>
          <p className="mt-1 text-2xl font-bold text-primary-800">{withImageCount}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-card">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            Total Incident Reports
          </span>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{reports.length}</p>
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
              onChange={(e) => setStatus(e.target.value as ReportStatus | 'ALL')}
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
              onChange={(e) => setPriority(e.target.value as ReportPriority | 'ALL')}
              aria-label="Filter by priority"
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Evidence filter */}
          <div className="sm:col-span-3">
            <Select
              value={evidenceFilter}
              onChange={(e) => setEvidenceFilter(e.target.value as any)}
              aria-label="Filter by evidence"
            >
              {EVIDENCE_OPTIONS.map((o) => (
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
              Showing {filtered.length} of {reports.length} reports
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
        <ErrorState message="Could not load food reports queue." onRetry={() => refetch()} />
      )}

      {isSuccess && filtered.length === 0 && (
        <EmptyState
          title="No reports matching your criteria"
          description={
            hasActiveFilters
              ? 'Try widening your filters or resetting the search query.'
              : 'There are currently no food safety reports on record.'
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

      {/* Case Table */}
      {filtered.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-card">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-25 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <th className="px-5 py-3.5">Evidence & Report</th>
                <th className="px-5 py-3.5">Establishment</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">AI Indicator</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Priority</th>
                <th className="px-5 py-3.5">Submitted</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((r, i) => (
                <Reveal
                  key={r.id}
                  as="tr"
                  variant="fade"
                  delay={i * 25}
                  onClick={() => navigate(`/reviewer/reports/${r.id}`)}
                  className="group cursor-pointer transition-colors hover:bg-neutral-25"
                >
                  {/* Evidence Thumbnail & Title */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100 border border-neutral-200">
                        {r.image ? (
                          <img
                            src={r.image}
                            alt=""
                            loading="lazy"
                            className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        ) : (
                          <ImageOff className="size-4 text-neutral-300" aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0 max-w-xs">
                        <span className="font-mono text-[11px] font-semibold text-neutral-500">
                          #REP-{r.id}
                        </span>
                        <p className="truncate font-semibold text-neutral-900 group-hover:text-primary-800">
                          {r.title}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Establishment */}
                  <td className="px-5 py-3.5">
                    <div className="text-xs">
                      <p className="font-semibold text-neutral-900">{r.restaurant.name}</p>
                      <p className="text-neutral-500">{r.restaurant.city}</p>
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="px-5 py-3.5">
                    <div className="text-xs">
                      <p className="font-medium text-neutral-800">
                        {r.customer.first_name} {r.customer.last_name}
                      </p>
                      <p className="text-neutral-400 truncate max-w-36">{r.customer.email}</p>
                    </div>
                  </td>

                  {/* AI Visual Indicator */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {r.image ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 border border-emerald-200">
                        <Camera className="size-3 text-emerald-600" />
                        Visual Evidence
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                        No Photo
                      </span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <StatusBadge status={r.status} />
                  </td>

                  {/* Priority Badge */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <PriorityBadge priority={r.priority} />
                  </td>

                  {/* Created Date */}
                  <td className="px-5 py-3.5 whitespace-nowrap text-xs text-neutral-500 font-mono">
                    {formatDate(r.created_at)}
                  </td>

                  {/* Open Case Action */}
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <Button
                      size="sm"
                      className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs group-hover:bg-primary-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/reviewer/reports/${r.id}`)
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
