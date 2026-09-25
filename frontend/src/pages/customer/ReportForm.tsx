import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { AppShell } from '@/components/layout/AppShell'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { ImageUploader } from '@/components/upload/ImageUploader'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/LoadingSkeleton'
import { useRestaurants } from '@/hooks/useRestaurants'
import { useCreateReport, useUpdateReport } from '@/hooks/useReports'
import { reportSchema, type ReportFormValues } from '@/lib/schemas'
import { toApiError } from '@/types/errors'
import type { FoodReport } from '@/types/report'

interface ReportFormProps {
  mode: 'create' | 'edit'
  existingReport?: FoodReport
}

export function ReportForm({ mode, existingReport }: ReportFormProps) {
  const navigate = useNavigate()
  const restaurantsQuery = useRestaurants()
  const createReport = useCreateReport()
  const updateReport = useUpdateReport(existingReport?.id ?? 0)
  const [image, setImage] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: existingReport
      ? {
          title: existingReport.title,
          description: existingReport.description,
          restaurant: String(existingReport.restaurant.id),
        }
      : undefined,
  })

  const isSubmitting = createReport.isPending || updateReport.isPending

  async function onSubmit(values: ReportFormValues) {
    setFormError(null)
    try {
      const restaurant = Number(values.restaurant)
      if (mode === 'create') {
        const created = await createReport.mutateAsync({ ...values, restaurant, image })
        navigate(`/reports/${created.id}`)
      } else if (existingReport) {
        await updateReport.mutateAsync({ ...values, restaurant, image: image ?? undefined })
        navigate(`/reports/${existingReport.id}`)
      }
    } catch (error) {
      setFormError(toApiError(error).message)
    }
  }

  return (
    <AppShell title={mode === 'create' ? 'New Report' : 'Edit Report'}>
      <div className="mx-auto max-w-2xl">
        <h2 className="text-xl font-semibold text-neutral-900">
          {mode === 'create' ? 'Report a food safety concern' : 'Edit your report'}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {mode === 'create'
            ? 'Reports are saved as a draft first — you can review everything before submitting.'
            : 'You can only edit reports while they remain in draft.'}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
          {restaurantsQuery.isLoading && <Skeleton className="h-10 w-full" />}
          {restaurantsQuery.isError && (
            <ErrorState message="Couldn't load restaurants." onRetry={() => restaurantsQuery.refetch()} />
          )}
          {restaurantsQuery.isSuccess && (
            <Select
              label="Restaurant"
              required
              error={errors.restaurant?.message}
              defaultValue={existingReport?.restaurant.id ?? ''}
              {...register('restaurant')}
            >
              <option value="" disabled>
                Select a restaurant
              </option>
              {restaurantsQuery.data.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.city}, {r.state}
                </option>
              ))}
            </Select>
          )}

          <Input label="Title" required error={errors.title?.message} {...register('title')} />
          <Textarea
            label="Description"
            required
            rows={5}
            error={errors.description?.message}
            {...register('description')}
          />
          <ImageUploader
            file={image}
            onChange={setImage}
            existingImageUrl={existingReport?.image}
            hint="Required before you can submit the report for review."
          />

          {formError && (
            <p role="alert" className="text-sm text-danger-600">
              {formError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" isLoading={isSubmitting}>
              {mode === 'create' ? 'Save Draft' : 'Save Changes'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
