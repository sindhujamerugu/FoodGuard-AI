import { useMemo, useState } from 'react'
import { FileText, Plus, Filter } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { ReportCard } from '@/components/reports/ReportCard'
import { Reveal } from '@/components/motion/Reveal'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { ListSkeleton } from '@/components/states/LoadingSkeleton'
import { LinkButton } from '@/components/ui/LinkButton'
import { Select } from '@/components/ui/Select'
import { useReports } from '@/hooks/useReports'
import { useTranslation, type TranslationKey } from '@/i18n/LanguageContext'
import type { ReportStatus } from '@/types/report'

const STATUS_FILTER_KEYS: Array<{ key: TranslationKey; value: ReportStatus | 'ALL' }> = [
  { key: 'reports.list.filterAllStatuses', value: 'ALL' },
  { key: 'status.draft', value: 'DRAFT' },
  { key: 'status.submitted', value: 'SUBMITTED' },
  { key: 'status.underReview', value: 'UNDER_REVIEW' },
  { key: 'status.resolved', value: 'RESOLVED' },
  { key: 'status.closed', value: 'CLOSED' },
]

export default function ReportsList() {
  const { data, isLoading, isError, isSuccess, refetch } = useReports()
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'ALL'>('ALL')
  const t = useTranslation()

  const reports = useMemo(() => {
    const all = data ?? []
    return statusFilter === 'ALL' ? all : all.filter((r) => r.status === statusFilter)
  }, [data, statusFilter])

  return (
    <AppShell title={t('reports.list.title')}>
      {/* Header section */}
      <div className="mb-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold text-primary-900">{t('reports.list.heading')}</h2>
          <p className="mt-2 text-base text-primary-700">{t('reports.list.subtitle')}</p>
        </div>
        <LinkButton to="/reports/new" className="shrink-0 bg-primary-600 hover:bg-primary-700 text-white shadow-sm">
          <Plus className="size-4" aria-hidden="true" />
          {t('reports.list.new')}
        </LinkButton>
      </div>

      {/* Filter */}
      {isSuccess && (data?.length ?? 0) > 0 && (
        <div className="mb-6">
          <div className="inline-flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 shadow-sm">
            <Filter className="size-4 text-neutral-500" aria-hidden="true" />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'ALL')}
              className="border-0 bg-transparent text-sm font-medium text-neutral-800 focus:ring-0"
              aria-label={t('reports.list.filterByStatusAria')}
            >
              {STATUS_FILTER_KEYS.map((f) => (
                <option key={f.value} value={f.value}>
                  {t(f.key)}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading && <ListSkeleton items={4} />}
      {isError && <ErrorState message={t('reports.list.loadError')} onRetry={() => refetch()} />}
      {isSuccess && (data?.length ?? 0) === 0 && (
        <EmptyState
          icon={<FileText className="size-6" aria-hidden="true" />}
          title={t('reports.list.emptyTitle')}
          description={t('reports.list.emptyDescription')}
          action={<LinkButton to="/reports/new" size="sm">{t('reports.list.createAction')}</LinkButton>}
        />
      )}
      {isSuccess && (data?.length ?? 0) > 0 && reports.length === 0 && (
        <EmptyState title={t('reports.list.emptyFilterTitle')} description={t('reports.list.emptyFilterDescription')} />
      )}
      {reports.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report, i) => (
            <Reveal key={report.id} delay={i * 60}>
              <ReportCard report={report} />
            </Reveal>
          ))}
        </div>
      )}
    </AppShell>
  )
}
