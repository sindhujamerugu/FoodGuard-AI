import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { AppShell } from '@/components/layout/AppShell'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { ImageUploader } from '@/components/upload/ImageUploader'
import { RestaurantSearchSelect } from '@/components/restaurants/RestaurantSearchSelect'
import { useCreateReport, useUpdateReport } from '@/hooks/useReports'
import { reportSchema, type ReportFormValues } from '@/lib/schemas'
import { useTranslation, type TranslationKey } from '@/i18n/LanguageContext'
import { toApiError } from '@/types/errors'
import type { FoodReport } from '@/types/report'

const VALIDATION_ERROR_KEYS: Record<string, TranslationKey> = {
  'Title is required.': 'validation.titleRequired',
  'Description is required.': 'validation.descriptionRequired',
  'Select a restaurant.': 'validation.selectRestaurant',
}

interface ReportFormProps {
  mode: 'create' | 'edit'
  existingReport?: FoodReport
}

export function ReportForm({ mode, existingReport }: ReportFormProps) {
  const navigate = useNavigate()
  const t = useTranslation()
  const createReport = useCreateReport()
  const updateReport = useUpdateReport(existingReport?.id ?? 0)
  const [image, setImage] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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

  const getErrorMessage = (msg?: string) => {
    if (!msg) return undefined
    const key = VALIDATION_ERROR_KEYS[msg]
    return key ? t(key) : msg
  }

  return (
    <AppShell title={mode === 'create' ? t('reports.form.newReport') : t('reports.form.editReport')}>
      <div className="mx-auto max-w-2xl">
        <h2 className="text-xl font-semibold text-neutral-900">
          {mode === 'create' ? t('reports.form.createHeading') : t('reports.form.editHeading')}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {mode === 'create'
            ? t('reports.form.createSubtitle')
            : t('reports.form.editSubtitle')}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
          <input type="hidden" {...register('restaurant')} />
          <RestaurantSearchSelect
            value={watch('restaurant')}
            onChange={(id) => setValue('restaurant', id, { shouldValidate: true })}
            error={getErrorMessage(errors.restaurant?.message)}
            initialRestaurant={existingReport?.restaurant}
          />

          <Input
            label={t('reports.form.titleLabel')}
            required
            error={getErrorMessage(errors.title?.message)}
            {...register('title')}
          />
          <Textarea
            label={t('reports.form.descriptionLabel')}
            required
            rows={5}
            error={getErrorMessage(errors.description?.message)}
            {...register('description')}
          />
          <ImageUploader
            file={image}
            onChange={setImage}
            existingImageUrl={existingReport?.image}
            hint={t('reports.form.imageHint')}
          />

          {formError && (
            <p role="alert" className="text-sm text-danger-600">
              {formError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" isLoading={isSubmitting}>
              {mode === 'create' ? t('reports.form.saveDraft') : t('reports.form.saveChanges')}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
