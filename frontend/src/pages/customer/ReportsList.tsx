import { useMemo, useState } from 'react'
import { CheckCircle2, Clock, FileText, Plus, Search, ShieldAlert, SortAsc, SortDesc } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ReportCard } from '@/components/reports/ReportCard'
import { Reveal } from '@/components/motion/Reveal'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { ListSkeleton } from '@/components/states/LoadingSkeleton'
import { useReports } from '@/hooks/useReports'
import { useComplaints } from '@/hooks/useComplaints'
import { useTranslation } from '@/i18n'
import { cn } from '@/lib/cn'
import type { ReportStatus } from '@/types/report'

// ── The only statuses the backend actually supports ───────────────────────────
// Do not invent statuses — AWAITING_RESPONSE / ESCALATED / REJECTED don't exist
// in FoodReport.Status and would always show 0 results.
type FilterValue = 'ALL' | ReportStatus

interface FilterTab {
  key: FilterValue
  label: string
  color: string          // active pill colour classes
  dotColor: string       // dot colour when active
}

// ── Filter tabs ───────────────────────────────────────────────────────────────
const FILTER_TABS: FilterTab[] = [
  {
    key: 'ALL',
    label: 'All',
    color: 'bg-primary-600 text-white',
    dotColor: 'bg-white',
  },
  {
    key: 'DRAFT',
    label: 'Draft',
    color: 'bg-neutral-700 text-white',
    dotColor: 'bg-neutral-300',
  },
  {
    key: 'SUBMITTED',
    label: 'Submitted',
    color: 'bg-info-600 text-white',
    dotColor: 'bg-info-300',
  },
  {
    key: 'UNDER_REVIEW',
    label: 'Under Review',
    color: 'bg-warning-600 text-white',
    dotColor: 'bg-warning-300',
  },
  {
    key: 'RESOLVED',
    label: 'Resolved',
    color: 'bg-success-600 text-white',
    dotColor: 'bg-success-300',
  },
  {
    key: 'CLOSED',
    label: 'Closed',
    color: 'bg-neutral-500 text-white',
    dotColor: 'bg-neutral-300',
  },
]

type SortOrder = 'newest' | 'oldest'

// ── Mini stat card ─────────────────────────────────────────────────────────

function MiniStat({
  label, value, icon: Icon, iconCls, loading,
}: {
  label: string; value: number; icon: React.ElementType
  iconCls: string; loading: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', iconCls)}>
        <Icon className="size-4.5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
        <p className="mt-0.5 text-2xl font-black text-neutral-900">
          {loading ? <span className="inline-block h-6 w-8 animate-pulse rounded bg-neutral-200" /> : value}
        </p>
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReportsList() {
  const { data, isLoading, isError, isSuccess, refetch } = useReports()
  const { data: complaints = [] } = useComplaints()
  const { t } = useTranslation()

  // Build a map: reportId → complaintId for the indicator chips in ReportCard
  const complaintByReport = useMemo(() => {
    const m = new Map<number, number>()
    complaints.forEach(c => m.set(c.food_report.id, c.id))
    return m
  }, [complaints])

  const [activeFilter, setActiveFilter] = useState<FilterValue>('ALL')
  const [search, setSearch]             = useState('')
  const [sort, setSort]                 = useState<SortOrder>('newest')

  // Count per status for badge display
  const counts = useMemo(() => {
    const all = data ?? []
    const result: Record<FilterValue, number> = {
      ALL: all.length,
      DRAFT: 0, SUBMITTED: 0, UNDER_REVIEW: 0, RESOLVED: 0, CLOSED: 0,
    }
    all.forEach(r => { result[r.status] = (result[r.status] ?? 0) + 1 })
    return result
  }, [data])

  // Stat values derived from counts
  const awaitingReview = (counts.SUBMITTED ?? 0)
  const underReview    = (counts.UNDER_REVIEW ?? 0)
  const resolved       = (counts.RESOLVED ?? 0) + (counts.CLOSED ?? 0)

  // Filtered + searched + sorted list
  const displayReports = useMemo(() => {
    let list = data ?? []

    if (activeFilter !== 'ALL') {
      list = list.filter(r => r.status === activeFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        r =>
          r.title.toLowerCase().includes(q) ||
          r.restaurant.name.toLowerCase().includes(q) ||
          String(r.id).includes(q),
      )
    }

    return [...list].sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return sort === 'newest' ? -diff : diff
    })
  }, [data, activeFilter, search, sort])

  const activeTab = FILTER_TABS.find(t => t.key === activeFilter)!

  return (
    <AppShell title="My Reports">

      {/* ── Page header ── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">
            {t('reports.list.heading')}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {t('reports.list.subtitle')}
          </p>
        </div>
        <Link
          to="/complaints/new"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-md"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t('reports.list.new')}
        </Link>
      </div>

      {/* ── Stats row ── */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Reveal delay={0}><MiniStat label="Total"          value={counts.ALL}  icon={FileText}     iconCls="bg-primary-100 text-primary-700" loading={isLoading} /></Reveal>
        <Reveal delay={50}><MiniStat label="Awaiting Review" value={awaitingReview} icon={Clock}  iconCls="bg-info-100 text-info-600"       loading={isLoading} /></Reveal>
        <Reveal delay={100}><MiniStat label="Under Review"  value={underReview} icon={ShieldAlert} iconCls="bg-warning-100 text-warning-700" loading={isLoading} /></Reveal>
        <Reveal delay={150}><MiniStat label="Resolved"      value={resolved}    icon={CheckCircle2} iconCls="bg-success-100 text-success-700" loading={isLoading} /></Reveal>
      </div>

      {/* ── Filter pill tabs — horizontal scroll on mobile ── */}
      {isSuccess && (
        <div className="mb-5">
          <div
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-none"
            role="tablist"
            aria-label="Filter by status"
          >
            {FILTER_TABS.map(tab => {
              const isActive = tab.key === activeFilter
              const count    = counts[tab.key]
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveFilter(tab.key)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium',
                    'transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
                    isActive
                      ? [tab.color, 'shadow-sm scale-[1.02]']
                      : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50',
                  )}
                >
                  {/* Coloured dot on inactive tabs for quick colour coding */}
                  {!isActive && (
                    <span
                      className={cn(
                        'size-2 rounded-full',
                        tab.key === 'ALL'          ? 'bg-primary-500' :
                        tab.key === 'DRAFT'        ? 'bg-neutral-400' :
                        tab.key === 'SUBMITTED'    ? 'bg-info-500'    :
                        tab.key === 'UNDER_REVIEW' ? 'bg-warning-500' :
                        tab.key === 'RESOLVED'     ? 'bg-success-500' :
                                                     'bg-neutral-400',
                      )}
                      aria-hidden="true"
                    />
                  )}
                  {tab.label}
                  {/* Count badge */}
                  {count > 0 && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                        isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-neutral-100 text-neutral-500',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Active filter indicator line */}
          <div className="mt-1 h-px w-full bg-neutral-100" />
        </div>
      )}

      {/* ── Search + sort toolbar ── */}
      {isSuccess && (data?.length ?? 0) > 0 && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, restaurant or ID…"
              className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-sm text-neutral-800 placeholder:text-neutral-400 shadow-sm transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
          {/* Sort toggle */}
          <button
            type="button"
            onClick={() => setSort(s => s === 'newest' ? 'oldest' : 'newest')}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50"
          >
            {sort === 'newest'
              ? <SortDesc className="size-4" aria-hidden="true" />
              : <SortAsc  className="size-4" aria-hidden="true" />}
            {sort === 'newest' ? 'Newest first' : 'Oldest first'}
          </button>
        </div>
      )}

      {/* ── States ── */}
      {isLoading && <ListSkeleton items={4} />}

      {isError && (
        <ErrorState
          message={t('reports.list.loadError')}
          onRetry={() => refetch()}
        />
      )}

      {/* Empty — no data at all */}
      {isSuccess && (data?.length ?? 0) === 0 && (
        <EmptyState
          icon={<FileText className="size-6" aria-hidden="true" />}
          title={t('reports.list.emptyTitle')}
          description={t('reports.list.emptyDescription')}
          action={
            <Link
              to="/complaints/new"
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              <Plus className="size-4" aria-hidden="true" />
              {t('reports.list.createAction')}
            </Link>
          }
        />
      )}

      {/* Empty — filter has no results */}
      {isSuccess && (data?.length ?? 0) > 0 && displayReports.length === 0 && (
        <EmptyState
          title={t('reports.list.emptyFilterTitle')}
          description={
            search.trim()
              ? `No reports match "${search}" in ${activeTab.label}.`
              : t('reports.list.emptyFilterDescription')
          }
        />
      )}

      {/* ── Report grid ── */}
      {displayReports.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {displayReports.map((report, i) => (
            <Reveal key={report.id} delay={Math.min(i * 40, 200)}>
              <ReportCard
                report={report}
                hasComplaint={complaintByReport.has(report.id)}
                complaintId={complaintByReport.get(report.id)}
              />
            </Reveal>
          ))}
        </div>
      )}
    </AppShell>
  )
}
