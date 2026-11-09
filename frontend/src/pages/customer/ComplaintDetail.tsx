import { useParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ComplaintOverview } from '@/components/complaints/ComplaintOverview'
import { ComplaintTimeline } from '@/components/complaints/ComplaintTimeline'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/LoadingSkeleton'
import { Reveal } from '@/components/motion/Reveal'
import { useComplaint } from '@/hooks/useComplaints'
import { useTranslation } from '@/i18n'

export default function ComplaintDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { data: complaint, isLoading, isError, refetch } = useComplaint(Number(id))

  return (
    <AppShell title={t('complaints.detail.title')}>
      <div className="mx-auto max-w-3xl">
        {isLoading && <Skeleton className="h-72 w-full rounded-2xl" />}
        {isError && <ErrorState message={t('complaints.detail.loadError')} onRetry={() => refetch()} />}
        {complaint && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
            <ComplaintOverview complaint={complaint} reportLinkBase="/reports" />
            <Reveal delay={100} className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-neutral-900">{t('complaints.detail.timeline')}</h3>
              <ComplaintTimeline complaint={complaint} />
            </Reveal>
          </div>
        )}
      </div>
    </AppShell>
  )
}
