import { MessageSquare } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { ComplaintCard } from '@/components/complaints/ComplaintCard'
import { Reveal } from '@/components/motion/Reveal'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { ListSkeleton } from '@/components/states/LoadingSkeleton'
import { LinkButton } from '@/components/ui/LinkButton'
import { useComplaints } from '@/hooks/useComplaints'
import { useTranslation } from '@/i18n'

export default function ComplaintsList() {
  const { t } = useTranslation()
  const { data, isLoading, isError, isSuccess, refetch } = useComplaints()

  return (
    <AppShell title={t('complaints.list.title')}>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">{t('complaints.list.heading')}</h2>
          <p className="mt-1 text-sm text-neutral-500">{t('complaints.list.subtitle')}</p>
        </div>
        <LinkButton to="/complaints/new">{t('complaints.list.fileAction')}</LinkButton>
      </div>

      {isLoading && <ListSkeleton items={4} />}
      {isError && <ErrorState message={t('complaints.list.loadError')} onRetry={() => refetch()} />}
      {isSuccess && data.length === 0 && (
        <EmptyState
          icon={<MessageSquare className="size-6" aria-hidden="true" />}
          title={t('complaints.list.emptyTitle')}
          description={t('complaints.list.emptyDescription')}
          action={<LinkButton to="/complaints/new" size="sm">{t('complaints.list.fileAction')}</LinkButton>}
        />
      )}
      {isSuccess && data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((complaint, i) => (
            <Reveal key={complaint.id} delay={i * 60}>
              <ComplaintCard complaint={complaint} />
            </Reveal>
          ))}
        </div>
      )}
    </AppShell>
  )
}
