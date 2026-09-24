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

export default function ComplaintCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedReportId = searchParams.get('reportId') ?? undefined

  const reportsQuery = useReports()
  const complaintsQuery = useComplaints()
  const createComplaint = useCreateComplaint()
  const [formError, setFormError] = useState<string | null>(null)

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
    <AppShell title="File a Complaint">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-xl font-semibold text-neutral-900">File a formal complaint</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Complaints can only be filed against reports you've already submitted for review.
        </p>

        {isLoading && <Skeleton className="mt-6 h-40 w-full rounded-2xl" />}
        {isError && (
          <ErrorState
            className="mt-6"
            message="Couldn't load your reports."
            onRetry={() => {
              void reportsQuery.refetch()
              void complaintsQuery.refetch()
            }}
          />
        )}

        {!isLoading && !isError && eligibleReports.length === 0 && (
          <EmptyState
            className="mt-6"
            title="No eligible reports"
            description="Submit a food safety report first, or check that it doesn't already have a complaint filed."
          />
        )}

        {!isLoading && !isError && eligibleReports.length > 0 && (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
            <Select
              label="Related report"
              required
              error={errors.food_report?.message}
              defaultValue={preselectedReportId ?? ''}
              {...register('food_report')}
            >
              <option value="" disabled>
                Select a report
              </option>
              {eligibleReports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} — {r.restaurant.name}
                </option>
              ))}
            </Select>

            <Select label="Category" required error={errors.category?.message} {...register('category')}>
              {Object.entries(COMPLAINT_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>

            <Input label="Title" required error={errors.title?.message} {...register('title')} />
            <Textarea
              label="Description"
              required
              rows={5}
              error={errors.description?.message}
              {...register('description')}
            />

            {formError && (
              <p role="alert" className="text-sm text-danger-600">
                {formError}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" isLoading={createComplaint.isPending}>
                Submit Complaint
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  )
}
