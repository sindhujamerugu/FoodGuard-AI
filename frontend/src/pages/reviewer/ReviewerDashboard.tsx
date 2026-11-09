import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  ImageOff,
  MessageSquare,
  Search,
  ShieldAlert,
  UserCheck,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { PriorityBadge } from '@/components/badges/PriorityBadge'
import { ErrorState } from '@/components/states/ErrorState'
import { TableSkeleton } from '@/components/states/LoadingSkeleton'
import { EmptyState } from '@/components/states/EmptyState'
import { Reveal } from '@/components/motion/Reveal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useReports } from '@/hooks/useReports'
import { useComplaints } from '@/hooks/useComplaints'
import { useRestaurants } from '@/hooks/useRestaurants'
import { formatDate } from '@/lib/format'
import type { FoodReport } from '@/types/report'

type QueueTab = 'all' | 'high_priority' | 'complaints' | 'reports'

interface PriorityQueueItem {
  id: string
  rawId: number
  type: 'REPORT' | 'COMPLAINT'
  title: string
  restaurantName: string
  restaurantCity: string
  customerName: string
  customerEmail: string
  status: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  image: string | null
  date: string
  link: string
  complaintCategory?: string
}

interface RecentActivityEvent {
  id: string
  title: string
  description: string
  timestamp: string
  link: string
  type: 'COMPLAINT_RESOLVED' | 'COMPLAINT_SUBMITTED' | 'REPORT_SUBMITTED'
}

const PRIORITY_ORDER: Record<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW', number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

export default function ReviewerDashboard() {
  const navigate = useNavigate()
  const reportsQuery = useReports()
  const complaintsQuery = useComplaints()
  const restaurantsQuery = useRestaurants()

  const [activeTab, setActiveTab] = useState<QueueTab>('all')
  const [searchFilter, setSearchFilter] = useState('')

  const reports = useMemo(() => reportsQuery.data ?? [], [reportsQuery.data])
  const complaints = useMemo(() => complaintsQuery.data ?? [], [complaintsQuery.data])
  const restaurants = useMemo(() => restaurantsQuery.data ?? [], [restaurantsQuery.data])

  // 1. Real KPI calculations
  const reportsNeedingAttention = useMemo(
    () => reports.filter((r) => r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW'),
    [reports],
  )

  const complaintsNeedingAttention = useMemo(
    () => complaints.filter((c) => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW'),
    [complaints],
  )

  const pendingRestaurantClaims = useMemo(
    () => restaurants.filter((r) => r.claim_status === 'PENDING' && !r.owner),
    [restaurants],
  )

  const unclaimedRestaurants = useMemo(
    () => restaurants.filter((r) => !r.owner && r.claim_status !== 'PENDING'),
    [restaurants],
  )

  const verifiedRestaurants = useMemo(
    () => restaurants.filter((r) => r.is_verified),
    [restaurants],
  )

  const highPriorityCasesCount = useMemo(() => {
    const highReports = reportsNeedingAttention.filter(
      (r) => r.priority === 'HIGH' || r.priority === 'CRITICAL',
    ).length
    const highComplaints = complaintsNeedingAttention.filter(
      (c) => c.priority === 'HIGH' || c.priority === 'CRITICAL',
    ).length
    return highReports + highComplaints
  }, [reportsNeedingAttention, complaintsNeedingAttention])

  // 2. Build map of reports to check image
  const reportMap = useMemo(() => {
    const map = new Map<number, FoodReport>()
    for (const r of reports) {
      map.set(r.id, r)
    }
    return map
  }, [reports])

  // 3. Unified Priority Review Queue Items
  const queueItems = useMemo<PriorityQueueItem[]>(() => {
    const items: PriorityQueueItem[] = []

    // Add active complaints
    for (const c of complaintsNeedingAttention) {
      const linkedReport = reportMap.get(c.food_report.id)
      items.push({
        id: `CMP-${c.id}`,
        rawId: c.id,
        type: 'COMPLAINT',
        title: c.title,
        restaurantName: c.restaurant.name,
        restaurantCity: c.restaurant.city,
        customerName: `${c.customer.first_name} ${c.customer.last_name}`,
        customerEmail: c.customer.email,
        status: c.status,
        priority: c.priority,
        image: linkedReport?.image ?? null,
        date: c.submitted_at,
        link: `/reviewer/complaints/${c.id}`,
        complaintCategory: c.category.replace(/_/g, ' '),
      })
    }

    // Add active reports that don't already have a complaint in the queue
    const complaintReportIds = new Set(complaintsNeedingAttention.map((c) => c.food_report.id))
    for (const r of reportsNeedingAttention) {
      if (!complaintReportIds.has(r.id)) {
        items.push({
          id: `REP-${r.id}`,
          rawId: r.id,
          type: 'REPORT',
          title: r.title,
          restaurantName: r.restaurant.name,
          restaurantCity: r.restaurant.city,
          customerName: `${r.customer.first_name} ${r.customer.last_name}`,
          customerEmail: r.customer.email,
          status: r.status,
          priority: r.priority,
          image: r.image,
          date: r.created_at,
          link: `/reviewer/reports/${r.id}`,
        })
      }
    }

    // Sort strictly by existing backend priority order, then newest date
    return items.sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  }, [complaintsNeedingAttention, reportsNeedingAttention, reportMap])

  // 4. Filter queue by tab and search
  const filteredQueue = useMemo(() => {
    let list = queueItems
    if (activeTab === 'high_priority') {
      list = list.filter((i) => i.priority === 'HIGH' || i.priority === 'CRITICAL')
    } else if (activeTab === 'complaints') {
      list = list.filter((i) => i.type === 'COMPLAINT')
    } else if (activeTab === 'reports') {
      list = list.filter((i) => i.type === 'REPORT')
    }

    const term = searchFilter.trim().toLowerCase()
    if (!term) return list
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.restaurantName.toLowerCase().includes(term) ||
        item.customerName.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term),
    )
  }, [queueItems, activeTab, searchFilter])

  // 5. Real Recent Activity (strictly using real database records and timestamps)
  const recentActivity = useMemo<RecentActivityEvent[]>(() => {
    const events: RecentActivityEvent[] = []

    // A. Resolved complaints with real resolved_at
    for (const c of complaints) {
      if (c.resolved_at) {
        events.push({
          id: `resolved-${c.id}`,
          title: `Complaint #${c.id} Resolved`,
          description: `Resolved for ${c.restaurant.name} · Notes: ${c.resolution_notes ? c.resolution_notes.slice(0, 70) + '...' : 'Investigation closed'}`,
          timestamp: c.resolved_at,
          link: `/reviewer/complaints/${c.id}`,
          type: 'COMPLAINT_RESOLVED',
        })
      }
    }

    // B. Submitted complaints
    for (const c of complaints) {
      events.push({
        id: `submitted-cmp-${c.id}`,
        title: `New Complaint Filed: #${c.id}`,
        description: `Filed by ${c.customer.first_name} ${c.customer.last_name} regarding ${c.restaurant.name}`,
        timestamp: c.submitted_at,
        link: `/reviewer/complaints/${c.id}`,
        type: 'COMPLAINT_SUBMITTED',
      })
    }

    // C. Submitted reports
    for (const r of reports) {
      if (r.status !== 'DRAFT') {
        events.push({
          id: `submitted-rep-${r.id}`,
          title: `Report Submitted: #${r.id}`,
          description: `"${r.title}" at ${r.restaurant.name}`,
          timestamp: r.created_at,
          link: `/reviewer/reports/${r.id}`,
          type: 'REPORT_SUBMITTED',
        })
      }
    }

    // Sort descending by real timestamp and take top 5
    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
  }, [complaints, reports])

  const isLoading = reportsQuery.isLoading || complaintsQuery.isLoading || restaurantsQuery.isLoading
  const isError = reportsQuery.isError || complaintsQuery.isError || restaurantsQuery.isError

  return (
    <AppShell title="Reviewer Dashboard">
      {/* Workspace Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary-600" />
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
              Reviewer Dashboard
            </h1>
          </div>
          <p className="mt-1 text-sm text-neutral-600">
            Review reports, investigate complaints, and manage cases requiring attention.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/reviewer/reports">
            <Button variant="outline" size="sm">
              <FileText className="size-3.5" />
              All Reports
            </Button>
          </Link>
          <Link to="/reviewer/complaints">
            <Button variant="outline" size="sm">
              <MessageSquare className="size-3.5" />
              All Complaints
            </Button>
          </Link>
          <Link to="/reviewer/restaurants">
            <Button size="sm" className="bg-primary-700 hover:bg-primary-800 text-white">
              <Building2 className="size-3.5" />
              Verifications
              {pendingRestaurantClaims.length > 0 && (
                <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-semibold text-white">
                  {pendingRestaurantClaims.length}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </div>

      {isError && (
        <div className="mb-6">
          <ErrorState
            message="Could not load reviewer dashboard metrics."
            onRetry={() => {
              void reportsQuery.refetch()
              void complaintsQuery.refetch()
              void restaurantsQuery.refetch()
            }}
          />
        </div>
      )}

      {/* Real KPI Row */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Reports Needing Attention */}
        <Reveal delay={0}>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Reports Needing Attention
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-warning-50 text-warning-700">
                <ShieldAlert className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-neutral-900">
                {reportsNeedingAttention.length}
              </span>
              <Link
                to="/reviewer/reports"
                className="text-xs font-medium text-primary-700 hover:underline inline-flex items-center gap-0.5"
              >
                Review <ArrowRight className="size-3" />
              </Link>
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">
              Submitted or under active reviewer review
            </p>
          </div>
        </Reveal>

        {/* Complaints Needing Attention */}
        <Reveal delay={60}>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Complaints Needing Attention
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-danger-50 text-danger-700">
                <MessageSquare className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-neutral-900">
                {complaintsNeedingAttention.length}
              </span>
              <Link
                to="/reviewer/complaints"
                className="text-xs font-medium text-primary-700 hover:underline inline-flex items-center gap-0.5"
              >
                Review <ArrowRight className="size-3" />
              </Link>
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">
              Formal customer complaints requiring resolution
            </p>
          </div>
        </Reveal>

        {/* Pending Restaurant Claims */}
        <Reveal delay={120}>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Pending Restaurant Claims
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Building2 className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-neutral-900">
                {pendingRestaurantClaims.length}
              </span>
              <Link
                to="/reviewer/restaurants"
                className="text-xs font-medium text-primary-700 hover:underline inline-flex items-center gap-0.5"
              >
                Verify <ArrowRight className="size-3" />
              </Link>
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">
              Ownership verification requests awaiting sign-off
            </p>
          </div>
        </Reveal>

        {/* High-Priority Cases (Only Real Priority Data) */}
        <Reveal delay={180}>
          <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                High-Priority Cases
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-danger-50 text-danger-700">
                <AlertTriangle className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-danger-700">
                {highPriorityCasesCount}
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('high_priority')}
                className="text-xs font-medium text-primary-700 hover:underline inline-flex items-center gap-0.5"
              >
                Filter <ArrowRight className="size-3" />
              </button>
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">
              Active cases flagged HIGH or CRITICAL severity
            </p>
          </div>
        </Reveal>
      </div>

      {/* Main Workspace Layout */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column (8 cols): Priority Review Queue */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-neutral-900">
                Priority Review Queue
              </h2>
              <p className="text-xs text-neutral-500">
                Triage order based on severity tier and real submission timestamp.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-neutral-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                  activeTab === 'all'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                All ({queueItems.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('high_priority')}
                className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                  activeTab === 'high_priority'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                High Priority ({highPriorityCasesCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('complaints')}
                className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                  activeTab === 'complaints'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Complaints ({complaintsNeedingAttention.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                  activeTab === 'reports'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Reports
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <Input
              placeholder="Search queue by title, restaurant, customer, or case ID..."
              className="pl-9 text-xs"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>

          {isLoading && <TableSkeleton rows={5} />}

          {!isLoading && filteredQueue.length === 0 && (
            <EmptyState
              title="No cases in this view"
              description={
                searchFilter
                  ? 'No cases match your search term. Try resetting your search.'
                  : 'All priority cases have been reviewed or resolved. Excellent work!'
              }
            />
          )}

          {/* Priority Queue Cards */}
          <div className="space-y-3">
            {filteredQueue.map((item, index) => (
              <Reveal key={item.id} delay={index * 30}>
                <div
                  onClick={() => navigate(item.link)}
                  className="group relative flex cursor-pointer flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-card transition-all hover:border-primary-300 hover:shadow-card-hover sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Thumbnail */}
                    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 border border-neutral-200">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          loading="lazy"
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-neutral-400">
                          <ImageOff className="size-4" />
                          <span className="text-[9px] mt-0.5">No photo</span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded">
                          #{item.id}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            item.type === 'COMPLAINT'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {item.type}
                        </span>
                        {item.complaintCategory && (
                          <span className="text-[11px] text-neutral-500 font-medium">
                            · {item.complaintCategory}
                          </span>
                        )}
                        <PriorityBadge priority={item.priority} />
                        <StatusBadge status={item.status as any} />
                      </div>

                      <h3 className="truncate text-sm font-semibold text-neutral-900 group-hover:text-primary-800">
                        {item.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="size-3 text-neutral-400" />
                          {item.restaurantName} ({item.restaurantCity})
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <UserCheck className="size-3 text-neutral-400" />
                          {item.customerName}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3 text-neutral-400" />
                          {formatDate(item.date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center gap-2 sm:shrink-0 sm:pl-3">
                    <Button
                      size="sm"
                      className="w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 text-white text-xs group-hover:bg-primary-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(item.link)
                      }}
                    >
                      Review Case
                      <ArrowRight className="size-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Right Column (4 cols): Restaurant Verification Summary & Recent Activity */}
        <div className="lg:col-span-4 space-y-6">
          {/* Restaurant Verification Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-primary-700" />
                <h3 className="text-sm font-bold tracking-tight text-neutral-900">
                  Restaurant Verification
                </h3>
              </div>
              <Link
                to="/reviewer/restaurants"
                className="text-xs font-semibold text-primary-700 hover:underline inline-flex items-center gap-1"
              >
                Manage <ExternalLink className="size-3" />
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-neutral-100 bg-neutral-25 p-2.5">
                <p className="text-lg font-bold text-neutral-900">
                  {pendingRestaurantClaims.length}
                </p>
                <p className="text-[10px] font-medium text-neutral-500">Pending</p>
              </div>
              <div className="rounded-xl border border-neutral-100 bg-neutral-25 p-2.5">
                <p className="text-lg font-bold text-neutral-900">
                  {unclaimedRestaurants.length}
                </p>
                <p className="text-[10px] font-medium text-neutral-500">Unclaimed</p>
              </div>
              <div className="rounded-xl border border-neutral-100 bg-neutral-25 p-2.5">
                <p className="text-lg font-bold text-neutral-900">
                  {verifiedRestaurants.length}
                </p>
                <p className="text-[10px] font-medium text-neutral-500">Verified</p>
              </div>
            </div>

            {/* Pending claim summary list */}
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                Awaiting Approval
              </p>
              {pendingRestaurantClaims.length === 0 ? (
                <div className="rounded-xl bg-neutral-50 p-3 text-center text-xs text-neutral-500">
                  No restaurant ownership claims pending.
                </div>
              ) : (
                pendingRestaurantClaims.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-neutral-900 truncate">{r.name}</p>
                      <p className="text-[11px] text-neutral-600 truncate">
                        Applicant: {r.claimed_by ? `${r.claimed_by.first_name} ${r.claimed_by.last_name}` : 'Unknown'}
                      </p>
                    </div>
                    <Link to="/reviewer/restaurants">
                      <Button size="sm" variant="outline" className="text-[11px] h-7 px-2 shrink-0">
                        Review
                      </Button>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity Card (Real Data Only) */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-neutral-700" />
                <h3 className="text-sm font-bold tracking-tight text-neutral-900">
                  Recent Activity
                </h3>
              </div>
              <span className="text-[11px] text-neutral-400">Live Audit Feed</span>
            </div>

            {recentActivity.length === 0 ? (
              <div className="py-6 text-center text-xs text-neutral-500">
                No recent activity recorded on this instance yet.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {recentActivity.map((evt) => (
                  <Link
                    key={evt.id}
                    to={evt.link}
                    className="block group rounded-xl p-2.5 transition-colors hover:bg-neutral-50 border border-transparent hover:border-neutral-200"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {evt.type === 'COMPLAINT_RESOLVED' ? (
                          <CheckCircle className="size-3.5 text-success-600 shrink-0" />
                        ) : evt.type === 'COMPLAINT_SUBMITTED' ? (
                          <MessageSquare className="size-3.5 text-rose-600 shrink-0" />
                        ) : (
                          <FileText className="size-3.5 text-blue-600 shrink-0" />
                        )}
                        <p className="text-xs font-semibold text-neutral-900 group-hover:text-primary-700 truncate">
                          {evt.title}
                        </p>
                      </div>
                      <span className="text-[10px] text-neutral-400 shrink-0 font-mono">
                        {formatDate(evt.timestamp)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-500 line-clamp-2">
                      {evt.description}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
