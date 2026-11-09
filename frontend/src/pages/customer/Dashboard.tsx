import { Link } from 'react-router-dom'
import {
  FileText,
  MessageSquare,
  Plus,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  User,
  ArrowRight,
  Clock,
  TrendingUp,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StatCard } from '@/components/dashboard/StatCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ReportCard } from '@/components/reports/ReportCard'
import { ComplaintCard } from '@/components/complaints/ComplaintCard'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { ListSkeleton } from '@/components/states/LoadingSkeleton'
import { LinkButton } from '@/components/ui/LinkButton'
import { Reveal } from '@/components/motion/Reveal'
import { useAuth } from '@/context/AuthContext'
import { useReports } from '@/hooks/useReports'
import { useComplaints } from '@/hooks/useComplaints'
import { useTranslation } from '@/i18n/LanguageContext'

export default function Dashboard() {
  const { user } = useAuth()
  const t = useTranslation()
  const reportsQuery = useReports()
  const complaintsQuery = useComplaints()

  const reports = reportsQuery.data ?? []
  const complaints = complaintsQuery.data ?? []

  // Sort by creation timestamp descending before slicing — the API may
  // return results in any order (e.g. by pk), so we must not rely on
  // insertion order for "recent" semantics.
  const recentReports = [...reports]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4)

  const recentComplaints = [...complaints]
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
    .slice(0, 4)

  const openReports = reports.filter(
    (r) => r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW',
  ).length
  const resolvedReports = reports.filter(
    (r) => r.status === 'RESOLVED' || r.status === 'CLOSED',
  ).length
  const openComplaints = complaints.filter(
    (c) => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW',
  ).length

  // Quick action definitions — all navigate to existing routes.
  const quickActions = [
    {
      label: t('dashboard.customer.quickActionReport'),
      to: '/reports/new',
      icon: Plus,
    },
    {
      label: t('dashboard.customer.quickActionReports'),
      to: '/reports',
      icon: FileText,
    },
    {
      label: t('dashboard.customer.quickActionComplaints'),
      to: '/complaints',
      icon: MessageSquare,
    },
    {
      label: t('dashboard.customer.quickActionProfile'),
      to: '/profile',
      icon: User,
    },
  ] as const

  return (
    <AppShell title={t('dashboard.customer.heading')}>
      {/* ── A. Welcome & Primary Action ─────────────────────────────── */}
      <Reveal variant="fade" className="mb-10">
        <div className="relative overflow-hidden rounded-xl border border-primary-200 bg-gradient-to-br from-primary-50 to-white p-8 sm:p-10">
          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-700">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Food Safety Intelligence
              </div>
              <h1 className="text-3xl font-semibold text-primary-900 sm:text-4xl">
                {t('dashboard.customer.welcome', { name: user?.first_name ?? '' })}
              </h1>
              <p className="mt-3 text-lg text-primary-700 leading-relaxed">
                {t('dashboard.customer.subtitle')}
              </p>
            </div>
            <LinkButton to="/reports/new" size="lg" className="shrink-0 bg-primary-600 hover:bg-primary-700 text-white shadow-sm">
              <Plus className="size-4" aria-hidden="true" />
              {t('dashboard.customer.newReport')}
            </LinkButton>
          </div>
        </div>
      </Reveal>

      {/* ── B. Key Metrics ───────────────────────────────────────────── */}
      <div className="mb-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: t('dashboard.customer.statTotalReports'),
            value: reportsQuery.isLoading ? '—' : reports.length,
            icon: FileText,
            tone: 'primary' as const,
            prominent: true,
          },
          {
            label: t('dashboard.customer.statAwaitingReview'),
            value: reportsQuery.isLoading ? '—' : openReports,
            icon: Clock,
            tone: 'warning' as const,
            prominent: false,
          },
          {
            label: t('dashboard.customer.statResolvedReports'),
            value: reportsQuery.isLoading ? '—' : resolvedReports,
            icon: CheckCircle2,
            tone: 'success' as const,
            prominent: false,
          },
          {
            label: t('dashboard.customer.statOpenComplaints'),
            value: complaintsQuery.isLoading ? '—' : openComplaints,
            icon: ShieldAlert,
            tone: 'danger' as const,
            prominent: false,
          },
        ].map((stat, i) => (
          <Reveal key={stat.label} delay={i * 70}>
            <StatCard {...stat} />
          </Reveal>
        ))}
      </div>

      {/* ── C. Recent Activity (Primary Content) ─────────────────────── */}
      <div className="mb-12 grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Recent Reports - Takes 2 columns on desktop */}
        <div className="lg:col-span-2">
          <SectionHeader
            title={t('dashboard.customer.recentReports')}
            action={
              <Link to="/reports" className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
                {t('common.viewAll')}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            }
          />
          {reportsQuery.isLoading && <ListSkeleton items={3} />}
          {reportsQuery.isError && (
            <ErrorState onRetry={() => reportsQuery.refetch()} />
          )}
          {reportsQuery.isSuccess && reports.length === 0 && (
            <EmptyState
              icon={<FileText className="size-6" aria-hidden="true" />}
              title={t('dashboard.customer.noReportsTitle')}
              description={t('dashboard.customer.noReportsDesc')}
              action={
                <LinkButton to="/reports/new" size="sm">
                  {t('dashboard.customer.createReport')}
                </LinkButton>
              }
            />
          )}
          {reportsQuery.isSuccess && reports.length > 0 && (
            <div className="space-y-4">
              {recentReports.map((report, i) => (
                <Reveal key={report.id} delay={i * 60}>
                  <ReportCard report={report} />
                </Reveal>
              ))}
            </div>
          )}
        </div>

        {/* Recent Complaints - Takes 1 column on desktop */}
        <div className="lg:col-span-1">
          <SectionHeader
            title={t('dashboard.customer.recentComplaints')}
            action={
              <Link
                to="/complaints"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
              >
                {t('common.viewAll')}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            }
          />
          {complaintsQuery.isLoading && <ListSkeleton items={3} />}
          {complaintsQuery.isError && (
            <ErrorState onRetry={() => complaintsQuery.refetch()} />
          )}
          {complaintsQuery.isSuccess && complaints.length === 0 && (
            <EmptyState
              icon={<MessageSquare className="size-6" aria-hidden="true" />}
              title={t('dashboard.customer.noComplaintsTitle')}
              description={t('dashboard.customer.noComplaintsDesc')}
            />
          )}
          {complaintsQuery.isSuccess && complaints.length > 0 && (
            <div className="space-y-4">
              {recentComplaints.map((complaint, i) => (
                <Reveal key={complaint.id} delay={i * 60}>
                  <ComplaintCard complaint={complaint} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── D. Quick Actions (Compact) ────────────────────────────────── */}
      <div className="mb-12">
        <SectionHeader title={t('dashboard.customer.quickActionsTitle')} />
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action, i) => (
            <Reveal key={action.to} delay={i * 60}>
              <Link
                to={action.to}
                className="group inline-flex items-center gap-2.5 rounded-lg border border-neutral-200 bg-white px-5 py-3 text-sm font-medium text-neutral-800 shadow-sm transition-all duration-200 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 motion-reduce:transition-none"
              >
                <action.icon className="size-4" aria-hidden="true" />
                {action.label}
                <ArrowRight className="size-3.5 opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" aria-hidden="true" />
              </Link>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ── E. Food Safety Context (AI Info) ──────────────────────────── */}
      <Reveal delay={80}>
        <div className="rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-primary-900">
                {t('dashboard.customer.aiInsightTitle')}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-primary-700">
                {t('dashboard.customer.aiInsightDesc')}
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </AppShell>
  )
}
