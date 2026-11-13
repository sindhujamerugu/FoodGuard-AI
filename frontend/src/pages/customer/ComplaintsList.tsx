import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Clock,
  MessageSquare,
  Plus,
  Search,
  ShieldAlert,
  SortAsc,
  SortDesc,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { ComplaintCard } from '@/components/complaints/ComplaintCard'
import { Reveal } from '@/components/motion/Reveal'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { ListSkeleton } from '@/components/states/LoadingSkeleton'
import { useComplaints } from '@/hooks/useComplaints'
import { useTranslation } from '@/i18n'
import { cn } from '@/lib/cn'
import type { ComplaintStatus } from '@/types/complaint'

type Filter = 'ALL' | ComplaintStatus
type Sort   = 'newest' | 'oldest'

// ── Status filter tabs — only real backend values ──────────────────────────

interface FilterTab { key: Filter; label: string; color: string; dot: string }
const FILTER_TABS: FilterTab[] = [
  { key: 'ALL',          label: 'All',          color: 'bg-primary-600 text-white',  dot: 'bg-primary-500' },
  { key: 'SUBMITTED',    label: 'Submitted',    color: 'bg-info-600 text-white',     dot: 'bg-info-400' },
  { key: 'UNDER_REVIEW', label: 'Under Review', color: 'bg-warning-600 text-white',  dot: 'bg-warning-400' },
  { key: 'RESOLVED',     label: 'Resolved',     color: 'bg-success-600 text-white',  dot: 'bg-success-400' },
  { key: 'CLOSED',       label: 'Closed',       color: 'bg-neutral-500 text-white',  dot: 'bg-neutral-400' },
  { key: 'REJECTED',     label: 'Rejected',     color: 'bg-danger-600 text-white',   dot: 'bg-danger-400' },
]

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

// ── Page ──────────────────────────────────────────────────────────────────

export default function ComplaintsList() {
  const { t } = useTranslation()
  const { data, isLoading, isError, isSuccess, refetch } = useComplaints()

  const [activeFilter, setActiveFilter] = useState<Filter>('ALL')
  const [search,       setSearch]       = useState('')
  const [sort,         setSort]         = useState<Sort>('newest')

  // Count per status
  const counts = useMemo(() => {
    const all = data ?? []
    const c: Record<Filter, number> = { ALL: all.length, SUBMITTED: 0, UNDER_REVIEW: 0, RESOLVED: 0, CLOSED: 0, REJECTED: 0 }
    all.forEach(x => { c[x.status] = (c[x.status] ?? 0) + 1 })
    return c
  }, [data])

  // Filtered + searched + sorted
  const displayed = useMemo(() => {
    let list = data ?? []
    if (activeFilter !== 'ALL') list = list.filter(c => c.status === activeFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.restaurant.name.toLowerCase().includes(q) ||
        c.food_report.title.toLowerCase().includes(q) ||
        String(c.id).includes(q),
      )
    }
    return [...list].sort((a, b) => {
      const diff = new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
      return sort === 'newest' ? -diff : diff
    })
  }, [data, activeFilter, search, sort])

  const activeTab = FILTER_TABS.find(t => t.key === activeFilter)!

  return (
    <AppShell title="My Complaints">

      {/* ── Page header ── */}
      <Reveal variant="fade" className="mb-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">My Complaints</h2>
            <p className="mt-1 max-w-xl text-sm text-neutral-500">
              Track every food-safety complaint you have filed — from first submission through
              review, escalation and final resolution.
            </p>
          </div>
          <Link
            to="/complaints/new"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-md"
          >
            <Plus className="size-4" aria-hidden="true" />
            File a Complaint
          </Link>
        </div>
      </Reveal>

      {/* ── Stats row ── */}
      <div className="mb-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Reveal delay={0}>
          <MiniStat label="Total"        value={counts.ALL}          icon={MessageSquare} iconCls="bg-primary-100 text-primary-700" loading={isLoading} />
        </Reveal>
        <Reveal delay={50}>
          <MiniStat label="Pending"      value={counts.SUBMITTED}    icon={Clock}         iconCls="bg-info-100 text-info-600"       loading={isLoading} />
        </Reveal>
        <Reveal delay={100}>
          <MiniStat label="Under Review" value={counts.UNDER_REVIEW} icon={ShieldAlert}   iconCls="bg-warning-100 text-warning-700" loading={isLoading} />
        </Reveal>
        <Reveal delay={150}>
          <MiniStat label="Resolved"     value={counts.RESOLVED + counts.CLOSED} icon={CheckCircle2} iconCls="bg-success-100 text-success-700" loading={isLoading} />
        </Reveal>
      </div>

      {/* ── Filter tabs ── */}
      {isSuccess && (
        <div className="mb-5">
          <div
            role="tablist"
            aria-label="Filter complaints by status"
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
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
                    'transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
                    isActive
                      ? [tab.color, 'shadow-sm scale-[1.03]']
                      : 'border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50',
                  )}
                >
                  {!isActive && (
                    <span className={cn('size-2 rounded-full', tab.dot)} aria-hidden="true" />
                  )}
                  {tab.label}
                  {count > 0 && (
                    <span className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                      isActive ? 'bg-white/25 text-white' : 'bg-neutral-100 text-neutral-500',
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="mt-2 h-px bg-neutral-100" />
        </div>
      )}

      {/* ── Search + sort ── */}
      {isSuccess && (data?.length ?? 0) > 0 && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by ID, title, restaurant or food item…"
              className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-neutral-400 shadow-sm transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <button
            type="button"
            onClick={() => setSort(s => s === 'newest' ? 'oldest' : 'newest')}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 transition"
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
      {isError && <ErrorState message={t('complaints.list.loadError')} onRetry={() => refetch()} />}

      {isSuccess && (data?.length ?? 0) === 0 && (
        <EmptyState
          icon={<MessageSquare className="size-6" aria-hidden="true" />}
          title="No complaints filed yet"
          description="Submit a food safety report and file a formal complaint to start tracking."
          action={
            <Link
              to="/complaints/new"
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              <Plus className="size-4" aria-hidden="true" /> File a Complaint
            </Link>
          }
        />
      )}

      {isSuccess && (data?.length ?? 0) > 0 && displayed.length === 0 && (
        <EmptyState
          title={`No complaints match "${search || activeTab.label}"`}
          description="Try a different filter or search term."
        />
      )}

      {/* ── Complaint list ── */}
      {displayed.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {displayed.map((complaint, i) => (
            <Reveal key={complaint.id} delay={Math.min(i * 40, 200)}>
              <ComplaintCard complaint={complaint} />
            </Reveal>
          ))}
        </div>
      )}
    </AppShell>
  )
}
