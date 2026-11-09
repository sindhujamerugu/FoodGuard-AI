import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { AppShell } from '@/components/layout/AppShell'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/LoadingSkeleton'
import { useReports } from '@/hooks/useReports'
import { useComplaints, useCreateComplaint } from '@/hooks/useComplaints'
import { complaintSchema, type ComplaintFormValues } from '@/lib/schemas'
import { COMPLAINT_CATEGORY_LABELS } from '@/types/complaint'
import { toApiError } from '@/types/errors'
import { useTranslation, type TranslationKey } from '@/i18n'

const COMPLAINT_CATEGORY_KEYS: Record<string, TranslationKey> = {
  FOOD_QUALITY: 'category.foodQuality',
  SPOILAGE: 'category.spoilage',
  FOREIGN_OBJECT: 'category.foreignObject',
  HYGIENE: 'category.hygiene',
  TASTE_OR_ODOR: 'category.tasteOrOdor',
  OTHER: 'category.other',
}

const VALIDATION_ERROR_KEYS: Record<string, TranslationKey> = {
  'Title is required.': 'validation.titleRequired',
  'Description is required.': 'validation.descriptionRequired',
  'Select a report.': 'validation.selectReport',
}

export default function ComplaintCreate() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedReportId = searchParams.get('reportId') ?? undefined

  const reportsQuery = useReports()
  const complaintsQuery = useComplaints()
  const createComplaint = useCreateComplaint()
  const [formError, setFormError] = useState<string | null>(null)

  function getErrorMessage(msg?: string): string | undefined {
    if (!msg) return undefined
    const key = VALIDATION_ERROR_KEYS[msg]
    return key ? t(key) : msg
  }

  const eligibleReports = useMemo(() => {
    const complaintReportIds = new Set(complaintsQuery.data?.map((c) => c.food_report.id))
    return (reportsQuery.data ?? []).filter((r) => r.status === 'SUBMITTED' && !complaintReportIds.has(r.id))
  }, [reportsQuery.data, complaintsQuery.data])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ComplaintFormValues>({
    resolver: zodResolver(complaintSchema),
    defaultValues: { food_report: preselectedReportId, category: 'FOOD_QUALITY' },
  })

  async function onSubmit(values: ComplaintFormValues) {
    setFormError(null)
    try {
      const created = await createComplaint.mutateAsync({ ...values, food_report: Number(values.food_report) })
      navigate(`/complaints/${created.id}`)
    } catch (error) {
      setFormError(toApiError(error).message)
    }
  }

  const isLoading = reportsQuery.isLoading || complaintsQuery.isLoading
  const isError = reportsQuery.isError || complaintsQuery.isError

  return (
    <AppShell title={t('complaints.create.title')}>
      <div className="mx-auto max-w-2xl">
        <h2 className="text-xl font-semibold text-neutral-900">{t('complaints.create.heading')}</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {t('complaints.create.subtitle')}
        </p>

        {isLoading && <Skeleton className="mt-6 h-40 w-full rounded-2xl" />}
        {isError && (
          <ErrorState
            className="mt-6"
            message={t('complaints.create.loadError')}
            onRetry={() => {
              void reportsQuery.refetch()
              void complaintsQuery.refetch()
            }}
          />
        )}

        {!isLoading && !isError && eligibleReports.length === 0 && (
          <EmptyState
            className="mt-6"
            title={t('complaints.create.noEligibleTitle')}
            description={t('complaints.create.noEligibleDesc')}
          />
        )}

        {!isLoading && !isError && eligibleReports.length > 0 && (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
            <Select
              label={t('complaints.create.reportLabel')}
              required
              error={getErrorMessage(errors.food_report?.message)}
              defaultValue={preselectedReportId ?? ''}
              {...register('food_report')}
            >
              <option value="" disabled>
                {t('complaints.create.selectReport')}
              </option>
              {eligibleReports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} — {r.restaurant.name}
                </option>
              ))}
            </Select>

            <Select
              label={t('complaints.create.categoryLabel')}
              required
              error={getErrorMessage(errors.category?.message)}
              {...register('category')}
            >
              {Object.keys(COMPLAINT_CATEGORY_LABELS).map((value) => {
                const key = COMPLAINT_CATEGORY_KEYS[value]
                return (
                  <option key={value} value={value}>
                    {key ? t(key) : COMPLAINT_CATEGORY_LABELS[value as keyof typeof COMPLAINT_CATEGORY_LABELS]}
                  </option>
                )
              })}
            </Select>

            <Input
              label={t('complaints.create.titleLabel')}
              required
              error={getErrorMessage(errors.title?.message)}
              {...register('title')}
            />
            <Textarea
              label={t('complaints.create.descriptionLabel')}
              required
              rows={5}
              error={getErrorMessage(errors.description?.message)}
              {...register('description')}
            />

            {formError && (
              <p role="alert" className="text-sm text-danger-600">
                {formError}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" isLoading={createComplaint.isPending}>
                {t('complaints.create.submitAction')}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  )
}
