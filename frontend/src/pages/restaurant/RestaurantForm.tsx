import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { AppShell } from '@/components/layout/AppShell'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useCreateRestaurant, useUpdateRestaurant } from '@/hooks/useRestaurants'
import { restaurantSchema, type RestaurantFormValues } from '@/lib/schemas'
import { toApiError } from '@/types/errors'
import type { Restaurant } from '@/types/restaurant'

interface RestaurantFormProps {
  mode: 'create' | 'edit'
  existingRestaurant?: Restaurant
}

export function RestaurantForm({ mode, existingRestaurant }: RestaurantFormProps) {
  const navigate = useNavigate()
  const createRestaurant = useCreateRestaurant()
  const updateRestaurant = useUpdateRestaurant(existingRestaurant?.id ?? 0)
  const [formError, setFormError] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(existingRestaurant?.is_active ?? true)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RestaurantFormValues>({
    resolver: zodResolver(restaurantSchema),
    defaultValues: existingRestaurant
      ? {
          name: existingRestaurant.name,
          description: existingRestaurant.description,
          address: existingRestaurant.address,
          city: existingRestaurant.city,
          state: existingRestaurant.state,
          pincode: existingRestaurant.pincode,
          contact_email: existingRestaurant.contact_email,
          contact_phone: existingRestaurant.contact_phone,
        }
      : undefined,
  })

  const isSubmitting = createRestaurant.isPending || updateRestaurant.isPending

  async function onSubmit(values: RestaurantFormValues) {
    setFormError(null)
    try {
      if (mode === 'create') {
        await createRestaurant.mutateAsync(values)
        navigate('/restaurant', { replace: true })
      } else if (existingRestaurant) {
        await updateRestaurant.mutateAsync({ ...values, is_active: isActive })
        navigate('/restaurant')
      }
    } catch (error) {
      setFormError(toApiError(error).message)
    }
  }

  return (
    <AppShell title={mode === 'create' ? 'New Restaurant' : 'Edit Restaurant'}>
      <div className="mx-auto max-w-2xl">
        <h2 className="text-xl font-semibold text-neutral-900">
          {mode === 'create' ? 'Register a restaurant' : 'Edit restaurant details'}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {mode === 'create'
            ? 'Provide accurate details — verification is handled by FoodGuard AI reviewers.'
            : 'Verification status can only be changed by a reviewer or admin.'}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
          <Input label="Restaurant name" required error={errors.name?.message} {...register('name')} />
          <Textarea label="Description" rows={3} error={errors.description?.message} {...register('description')} />
          <Textarea label="Address" required rows={2} error={errors.address?.message} {...register('address')} />

          <div className="grid grid-cols-2 gap-4">
            <Input label="City" required error={errors.city?.message} {...register('city')} />
            <Input label="State" required error={errors.state?.message} {...register('state')} />
          </div>
          <Input label="Pincode" required error={errors.pincode?.message} {...register('pincode')} />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Contact email"
              type="email"
              error={errors.contact_email?.message}
              {...register('contact_email')}
            />
            <Input label="Contact phone" type="tel" error={errors.contact_phone?.message} {...register('contact_phone')} />
          </div>

          {mode === 'edit' && (
            <label className="flex items-center gap-2.5 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Restaurant is active and open for reports
            </label>
          )}

          {formError && (
            <p role="alert" className="text-sm text-danger-600">
              {formError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" isLoading={isSubmitting}>
              {mode === 'create' ? 'Create Restaurant' : 'Save Changes'}
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
