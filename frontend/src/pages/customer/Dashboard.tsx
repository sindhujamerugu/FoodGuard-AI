/**
 * Customer Dashboard
 *
 * Layout (top → bottom):
 *  1. Welcome hero
 *  2. Stats row (4 cards)
 *  3. Activity row  — Reports (left 60%) + Complaints (right 40%)
 *  4. Notifications — full-width, compact horizontal list
 *  5. Quick Actions — 4 equal-width cards, full-width
 *  6. AI info banner — full-width
 *
 * Layout fix rationale:
 *  The old 3-column grid crammed Complaints + Notifications into one right
 *  column, leaving a large blank area when either section was short.
 *  Separating them into individual rows eliminates the empty space and gives
 *  each section its own consistent full-width context.
 */
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Plus,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  User,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Reveal } from '@/components/motion/Reveal'
import { ErrorState } from '@/components/states/ErrorState'
import { ListSkeleton } from '@/components/states/LoadingSkeleton'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { useAuth } from '@/context/AuthContext'
import { useReports } from '@/hooks/useReports'
import { useComplaints } from '@/hooks/useComplaints'
import { useNotifications } from '@/hooks/useNotifications'
import { useTranslation } from '@/i18n/LanguageContext'
import { formatDate, formatRelative, initials } from '@/lib/format'
import { cn } from '@/lib/cn'

// ── Stat card ─────────────────────────────────────────────────────────────────

const colorMap = {
  green: { icon: 'bg-primary-100 text-primary-700', value: 'text-primary-800', border: 'border-primary-100 hover:border-primary-300' },
  amber: { icon: 'bg-warning-100 text-warning-700', value: 'text-warning-800', border: 'border-warning-100 hover:border-warning-300' },
  blue:  { icon: 'bg-info-100 text-info-600',       value: 'text-info-800',    border: 'border-info-100 hover:border-info-300'   },
  red:   { icon: 'bg-danger-100 text-danger-600',   value: 'text-danger-800',  border: 'border-danger-100 hover:border-danger-300' },
}

interface StatCardProps {
  label: string; value: number | string
  icon: React.ElementType; color: keyof typeof colorMap
  loading?: boolean; to?: string
}

function StatCard({ label, value, icon: Icon, color, loading, to }: StatCardProps) {
  const c = colorMap[color]
  const inner = (
    <div className={cn(
      'flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm',
      'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
      c.border,
    )}>
      <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', c.icon)}>
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 truncate">{label}</p>
        <p className={cn('mt-1 text-3xl font-black leading-none', c.value)}>
          {loading
            ? <span className="inline-block h-8 w-8 animate-pulse rounded bg-neutral-200" />
            : value}
        </p>
      </div>
    </div>
  )
  return to ? <Link to={to} className="block">{inner}</Link> : inner
}

// ── Activity row ──────────────────────────────────────────────────────────────

function ActivityRow({
  id, title, subtitle, status, date, image, to, type,
}: {
  id: number; title: string; subtitle: string; status: Parameters<typeof StatusBadge>[0]['status']
  date: string; image?: string | null; to: string; type: 'report' | 'complaint'
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-neutral-100 bg-white p-3.5 transition-all duration-200 hover:border-primary-200 hover:shadow-sm"
    >
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100">
        {image
          ? <img src={image} alt="" className="size-full object-cover" loading="lazy" />
          : type === 'report'
            ? <FileText className="size-4 text-neutral-400" aria-hidden="true" />
            : <MessageSquare className="size-4 text-primary-400" aria-hidden="true" />
        }
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-xs font-mono text-neutral-400">#{id}</span>
          <span className="truncate text-sm font-medium text-neutral-900 group-hover:text-primary-800 transition-colors">{title}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-neutral-400">{subtitle}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusBadge status={status} />
        <span className="text-xs text-neutral-400 whitespace-nowrap">{date}</span>
      </div>
    </Link>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon, title, viewAllTo, viewAllLabel = 'View all',
}: {
  icon: React.ElementType; title: string; viewAllTo?: string; viewAllLabel?: string
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary-600" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
      </div>
      {viewAllTo && (
        <Link
          to={viewAllTo}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
        >
          {viewAllLabel} <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user }      = useAuth()
  const t             = useTranslation()
  const { language }  = t

  const reportsQuery    = useReports()
  const complaintsQuery = useComplaints()
  const { data: notifications = [] } = useNotifications()

  const reports    = reportsQuery.data    ?? []
  const complaints = complaintsQuery.data ?? []

  const totalReports    = reports.length
  const awaitingReview  = reports.filter(r => r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW').length
  const resolvedReports = reports.filter(r => r.status === 'RESOLVED' || r.status === 'CLOSED').length
  const openComplaints  = complaints.filter(c => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW').length

  const recentReports = [...reports]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4)

  const recentComplaints = [...complaints]
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
    .slice(0, 4)

  // Show up to 4 most-recent notifications (read + unread)
  const recentNotifs  = [...notifications]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4)
  const unreadCount   = notifications.filter(n => !n.is_read).length

  const firstName = user?.first_name ?? ''

  return (
    <AppShell title="Dashboard">

      {/* ── 1. WELCOME HERO ─────────────────────────────────────────── */}
      <Reveal variant="fade" className="mb-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-800 via-primary-700 to-primary-500 shadow-lg">
          <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-10 left-1/3 size-44 rounded-full bg-white/5 blur-2xl" aria-hidden="true" />
          <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold text-white ring-2 ring-white/25 select-none backdrop-blur-sm">
                {initials(user?.first_name ?? '', user?.last_name ?? '')}
              </div>
              <div>
                <p className="text-sm font-medium text-primary-200">Food Safety Portal</p>
                <h1 className="text-2xl font-bold text-white sm:text-3xl">
                  {firstName ? `Welcome back, ${firstName}! 👋` : 'Welcome back!'}
                </h1>
                <p className="mt-1 max-w-sm text-sm text-primary-200">
                  {t('dashboard.customer.subtitle')}
                </p>
              </div>
            </div>
            <Link
              to="/complaints/new"
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-primary-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-50 hover:shadow-md sm:self-auto"
            >
              <Plus className="size-4" aria-hidden="true" />
              Report Food Issue
            </Link>
          </div>
        </div>
      </Reveal>

      {/* ── 2. STATS ROW ────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {([
          { label: 'Total Reports',   value: totalReports,    icon: FileText,     color: 'green' as const, to: '/reports',    loading: reportsQuery.isLoading },
          { label: 'Awaiting Review', value: awaitingReview,  icon: Clock,        color: 'amber' as const, loading: reportsQuery.isLoading },
          { label: 'Resolved',        value: resolvedReports, icon: CheckCircle2, color: 'blue'  as const, loading: reportsQuery.isLoading },
          { label: 'Open Complaints', value: openComplaints,  icon: ShieldAlert,  color: 'red'   as const, to: '/complaints', loading: complaintsQuery.isLoading },
        ]).map((stat, i) => (
          <Reveal key={stat.label} delay={i * 55}>
            <StatCard {...stat} />
          </Reveal>
        ))}
      </div>

      {/* ── 3. ACTIVITY ROW — Reports (left) + Complaints (right) ───── */}
      {/* Each section is independently sized — no shared parent height,
          so a short Complaints list never creates blank space next to Reports */}
      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Recent Reports */}
        <Reveal delay={0}>
          <section className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
            <SectionHeader icon={FileText} title="Recent Reports" viewAllTo="/reports" />
            {reportsQuery.isLoading && <ListSkeleton items={3} />}
            {reportsQuery.isError   && <ErrorState onRetry={() => reportsQuery.refetch()} />}
            {reportsQuery.isSuccess && recentReports.length === 0 && (
              <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 py-8 text-center">
                <FileText className="mx-auto mb-2 size-6 text-neutral-300" aria-hidden="true" />
                <p className="text-sm text-neutral-500">No reports yet</p>
                <Link
                  to="/complaints/new"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                >
                  <Plus className="size-3.5" aria-hidden="true" /> File your first report
                </Link>
              </div>
            )}
            {reportsQuery.isSuccess && recentReports.length > 0 && (
              <div className="space-y-2">
                {recentReports.map(r => (
                  <ActivityRow
                    key={r.id}
                    id={r.id}
                    title={r.title}
                    subtitle={r.restaurant?.name ?? ''}
                    status={r.status}
                    date={formatDate(r.created_at, language)}
                    image={r.image}
                    to={`/reports/${r.id}`}
                    type="report"
                  />
                ))}
              </div>
            )}
          </section>
        </Reveal>

        {/* Recent Complaints */}
        <Reveal delay={60}>
          <section className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
            <SectionHeader icon={MessageSquare} title="Recent Complaints" viewAllTo="/complaints" />
            {complaintsQuery.isLoading && <ListSkeleton items={3} />}
            {complaintsQuery.isError   && <ErrorState onRetry={() => complaintsQuery.refetch()} />}
            {complaintsQuery.isSuccess && recentComplaints.length === 0 && (
              <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 py-8 text-center">
                <MessageSquare className="mx-auto mb-2 size-6 text-neutral-300" aria-hidden="true" />
                <p className="text-sm text-neutral-500">No complaints yet</p>
                <p className="mt-1 text-xs text-neutral-400">Complaints are filed after submitting a report.</p>
              </div>
            )}
            {complaintsQuery.isSuccess && recentComplaints.length > 0 && (
              <div className="space-y-2">
                {recentComplaints.map(c => (
                  <ActivityRow
                    key={c.id}
                    id={c.id}
                    title={c.title}
                    subtitle={c.restaurant?.name ?? ''}
                    status={c.status}
                    date={formatDate(c.submitted_at, language)}
                    to={`/complaints/${c.id}`}
                    type="complaint"
                  />
                ))}
              </div>
            )}
          </section>
        </Reveal>
      </div>

      {/* ── 4. NOTIFICATIONS — full-width, never creates imbalance ───── */}
      <Reveal delay={60} className="mb-6">
        <section className="rounded-2xl border border-primary-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-primary-600" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-neutral-900">Notifications</h2>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <Link
              to="/notifications"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              View all <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </div>

          {recentNotifs.length === 0 ? (
            /* Empty state — compact, full-width */
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-5 py-4">
              <Bell className="size-5 shrink-0 text-neutral-300" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-neutral-500">You're all caught up</p>
                <p className="text-xs text-neutral-400">Notifications will appear here when your reports or complaints are updated.</p>
              </div>
            </div>
          ) : (
            /* Horizontal grid on wide screens, vertical stack on mobile */
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {recentNotifs.map(n => (
                <Link
                  key={n.id}
                  to="/notifications"
                  className={cn(
                    'flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-xs transition-colors hover:bg-primary-50',
                    n.is_read
                      ? 'bg-neutral-50 text-neutral-600'
                      : 'bg-primary-50/70 text-neutral-800 font-medium',
                  )}
                >
                  <span
                    className={cn(
                      'mt-1 size-1.5 shrink-0 rounded-full',
                      n.is_read ? 'bg-neutral-300' : 'bg-primary-500',
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="line-clamp-2 leading-relaxed">
                      {n.localized_message || n.message}
                    </p>
                    <p className="mt-1 text-[10px] text-neutral-400">
                      {formatRelative(n.created_at, language)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      {/* ── 5. QUICK ACTIONS — full-width, 4 equal cards ─────────────── */}
      <Reveal delay={80} className="mb-6">
        <section className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label:   'Report Issue',
                desc:    'File a new food safety report',
                to:      '/complaints/new',
                Icon:    Plus,
                primary: true,
              },
              {
                label:   'My Reports',
                desc:    'View and track all reports',
                to:      '/reports',
                Icon:    FileText,
                primary: false,
              },
              {
                label:   'My Complaints',
                desc:    'Track complaint progress',
                to:      '/complaints',
                Icon:    TrendingUp,
                primary: false,
              },
              {
                label:   'My Profile',
                desc:    'Manage your account',
                to:      '/profile',
                Icon:    User,
                primary: false,
              },
            ].map(({ label, desc, to, Icon, primary }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  'group flex flex-col gap-3 rounded-xl p-4 text-left transition-all duration-200',
                  'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
                  primary
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'border border-neutral-100 bg-neutral-50 text-neutral-700 hover:border-primary-200 hover:bg-white hover:text-primary-800',
                )}
              >
                <div className={cn(
                  'flex size-9 items-center justify-center rounded-lg',
                  primary ? 'bg-white/20' : 'bg-primary-50 text-primary-600 group-hover:bg-primary-100',
                )}>
                  <Icon className="size-4.5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">{label}</p>
                  <p className={cn(
                    'mt-1 text-xs leading-snug',
                    primary ? 'text-white/70' : 'text-neutral-400',
                  )}>
                    {desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ── 6. AI INFO BANNER — full-width ───────────────────────────── */}
      <Reveal delay={100}>
        <div className="rounded-2xl border border-primary-100 bg-gradient-to-r from-primary-50 to-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary-900">
                AI-assisted food safety assessment
              </h3>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-primary-700">
                Every submitted report can receive a preliminary AI visual assessment — a fast,
                transparent first look at possible food-quality concerns. Results are
                <strong> indicative only</strong> and are not certified food-safety
                determinations. A human reviewer always has the final say.
              </p>
            </div>
          </div>
        </div>
      </Reveal>

    </AppShell>
  )
}
