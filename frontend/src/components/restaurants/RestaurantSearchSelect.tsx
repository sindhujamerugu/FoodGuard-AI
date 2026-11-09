import { useState, useRef, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Search, Plus, Check, ChevronsUpDown, X, Store, AlertCircle } from 'lucide-react'
import { useRestaurants, useCreateRestaurant } from '@/hooks/useRestaurants'
import { restaurantSchema, type RestaurantFormValues } from '@/lib/schemas'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/states/LoadingSkeleton'
import { cn } from '@/lib/cn'
import { useTranslation, type TranslationKey } from '@/i18n/LanguageContext'
import {
  getLocalizedRestaurantName,
  getLocalizedCity,
  getLocalizedState,
  matchesRestaurantSearch,
} from '@/lib/restaurantLocalization'
import { toApiError } from '@/types/errors'
import type { Restaurant, RestaurantMinimal } from '@/types/restaurant'

const MODAL_VALIDATION_KEYS: Record<string, TranslationKey> = {
  'Restaurant name is required.': 'validation.restaurantNameRequired',
  'Address is required.': 'validation.addressRequired',
  'City is required.': 'validation.cityRequired',
  'State is required.': 'validation.stateRequired',
  'Pincode must be 4–10 alphanumeric characters.': 'validation.pincodeInvalid',
  'Enter a valid email address.': 'validation.emailInvalid',
  'Enter a valid phone number (7–20 digits).': 'validation.phoneInvalid',
}

interface RestaurantSearchSelectProps {
  value?: string | number
  onChange: (id: string) => void
  error?: string
  required?: boolean
  label?: string
  initialRestaurant?: Restaurant | RestaurantMinimal
}

export function RestaurantSearchSelect({
  value,
  onChange,
  error,
  required = true,
  label,
  initialRestaurant,
}: RestaurantSearchSelectProps) {
  const { t, language } = useTranslation()
  const displayLabel = label ?? t('restaurantSelect.label')
  const { data: restaurants, isLoading, isError, refetch } = useRestaurants()
  const createRestaurant = useCreateRestaurant()

  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)

  // Find currently selected restaurant
  const selectedRestaurant = useMemo(() => {
    if (!value) return null
    const numericId = Number(value)
    const match = restaurants?.find((r) => r.id === numericId)
    if (match) return match
    if (initialRestaurant && initialRestaurant.id === numericId) return initialRestaurant
    return null
  }, [value, restaurants, initialRestaurant])

  // Filter restaurants by search query (canonical & localized name, city, state)
  const filtered = useMemo(() => {
    if (!restaurants) return []
    const term = search.trim()
    if (!term) return restaurants
    return restaurants.filter((r) => matchesRestaurantSearch(r, term, language))
  }, [restaurants, search, language])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Form for adding a new restaurant
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: modalErrors },
  } = useForm<RestaurantFormValues>({
    resolver: zodResolver(restaurantSchema),
    defaultValues: {
      name: '',
      description: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      contact_email: '',
      contact_phone: '',
    },
  })

  function handleOpenAddModal() {
    setCreateError(null)
    reset({
      name: search.trim(),
      description: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      contact_email: '',
      contact_phone: '',
    })
    setIsOpen(false)
    setIsAddModalOpen(true)
  }

  async function onAddRestaurantSubmit(values: RestaurantFormValues) {
    setCreateError(null)
    try {
      const created = await createRestaurant.mutateAsync({
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        address: values.address.trim(),
        city: values.city.trim(),
        state: values.state.trim(),
        pincode: values.pincode.trim(),
        contact_email: values.contact_email?.trim() || undefined,
        contact_phone: values.contact_phone?.trim() || undefined,
      })

      // Automatically select the created or matched restaurant
      onChange(String(created.id))
      setSearch('')
      setIsAddModalOpen(false)
    } catch (err) {
      setCreateError(toApiError(err).message)
    }
  }

  const getModalErrorMessage = (msg?: string) => {
    if (!msg) return undefined
    const key = MODAL_VALIDATION_KEYS[msg]
    return key ? t(key) : msg
  }

  return (
    <div className="space-y-1.5" ref={dropdownRef}>
      <label className="block text-sm font-medium text-neutral-800">
        {displayLabel}
        {required && <span className="ml-1 text-danger-500">*</span>}
      </label>

      {/* Selected State View */}
      {selectedRestaurant ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-25 px-4 py-3 shadow-sm transition-all hover:border-neutral-300">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
              <Store className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-neutral-900">
                  {getLocalizedRestaurantName(selectedRestaurant.name, language)}
                </span>
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                    'is_verified' in selectedRestaurant && selectedRestaurant.is_verified
                      ? 'bg-success-50 text-success-700'
                      : 'bg-neutral-100 text-neutral-600',
                  )}
                >
                  {'is_verified' in selectedRestaurant && selectedRestaurant.is_verified ? t('restaurantSelect.verified') : t('claimStatus.unclaimed')}
                </span>
              </div>
              <p className="truncate text-xs text-neutral-500">
                {'address' in selectedRestaurant && selectedRestaurant.address ? `${selectedRestaurant.address}, ` : ''}
                {getLocalizedCity(selectedRestaurant.city, language)}, {getLocalizedState(selectedRestaurant.state, language)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onChange('')
              setSearch('')
              setIsOpen(true)
            }}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            {t('restaurantSelect.change')}
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        /* Search / Select Trigger */
        <div className="relative">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              aria-label={t('restaurantSelect.searchAria')}
              placeholder={t('restaurantSelect.searchPlaceholder')}
              value={search}
              onFocus={() => setIsOpen(true)}
              onChange={(e) => {
                setSearch(e.target.value)
                setIsOpen(true)
              }}
              className={cn(
                'w-full rounded-xl border bg-white py-2.5 pl-10 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/20',
                error ? 'border-danger-400 focus:border-danger-500 focus:ring-danger-500/20' : 'border-neutral-200 focus:border-primary-500',
              )}
            />
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-label={t('restaurantSelect.toggleAria')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-400 hover:text-neutral-600"
            >
              <ChevronsUpDown className="h-4 w-4" />
            </button>
          </div>

          {/* Dropdown Menu */}
          {isOpen && (
            <div
              role="listbox"
              className="absolute z-20 mt-1.5 max-h-72 w-full overflow-auto rounded-xl border border-neutral-100 bg-white p-1.5 shadow-popover focus:outline-none"
            >
              {isLoading && (
                <div className="p-3 space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              )}

              {isError && (
                <div className="p-4 text-center">
                  <p className="text-xs text-danger-600">{t('restaurantSelect.loadError')}</p>
                  <Button size="sm" variant="ghost" onClick={() => refetch()} className="mt-2 text-xs">
                    {t('common.retry')}
                  </Button>
                </div>
              )}

              {!isLoading && !isError && filtered.length === 0 && (
                <div className="px-4 py-5 text-center">
                  <p className="text-sm font-medium text-neutral-700">{t('restaurantSelect.noRestaurantFound')}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {search ? t('restaurantSelect.noMatches', { search }) : t('restaurantSelect.noListed')}
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('restaurantSelect.cantFindAdd')}
                  </button>
                </div>
              )}

              {!isLoading && !isError && filtered.length > 0 && (
                <>
                  <div className="py-1">
                    {filtered.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        role="option"
                        aria-selected={Number(value) === r.id}
                        onClick={() => {
                          onChange(String(r.id))
                          setIsOpen(false)
                          setSearch('')
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-neutral-50 transition-colors group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-neutral-900 group-hover:text-primary-700 truncate">
                            {getLocalizedRestaurantName(r.name, language)}
                          </p>
                          <p className="text-xs text-neutral-500 truncate">
                            {getLocalizedCity(r.city, language)}, {getLocalizedState(r.state, language)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-medium',
                              r.is_verified
                                ? 'bg-success-50 text-success-700'
                                : 'bg-neutral-100 text-neutral-600',
                            )}
                          >
                            {r.is_verified ? t('restaurantSelect.verified') : t('claimStatus.unclaimed')}
                          </span>
                          {Number(value) === r.id && <Check className="h-4 w-4 text-primary-600" />}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Add action in dropdown footer */}
                  <div className="border-t border-neutral-100 mt-1 pt-1.5 px-1">
                    <button
                      type="button"
                      onClick={handleOpenAddModal}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-primary-700 hover:bg-primary-50 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t('restaurantSelect.cantFindAdd')}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-danger-600">
          {error}
        </p>
      )}

      {/* Add Restaurant Modal */}
      <Modal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t('restaurantSelect.modalTitle')}
        description={t('restaurantSelect.modalDescription')}
        size="md"
      >
        <div
          className="space-y-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
              e.preventDefault()
              void handleSubmit(onAddRestaurantSubmit)()
            }
          }}
        >
          {createError && (
            <div className="flex items-center gap-2 rounded-xl bg-danger-50 p-3 text-xs text-danger-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <Input
            label={t('restaurantSelect.nameLabel')}
            required
            error={getModalErrorMessage(modalErrors.name?.message)}
            placeholder={t('restaurantSelect.namePlaceholder')}
            {...register('name')}
          />

          <Input
            label={t('restaurantSelect.addressLabel')}
            required
            error={getModalErrorMessage(modalErrors.address?.message)}
            placeholder={t('restaurantSelect.addressPlaceholder')}
            {...register('address')}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('restaurantSelect.cityLabel')}
              required
              error={getModalErrorMessage(modalErrors.city?.message)}
              placeholder={t('restaurantSelect.cityPlaceholder')}
              {...register('city')}
            />

            <Input
              label={t('restaurantSelect.stateLabel')}
              required
              error={getModalErrorMessage(modalErrors.state?.message)}
              placeholder={t('restaurantSelect.statePlaceholder')}
              {...register('state')}
            />
          </div>

          <Input
            label={t('restaurantSelect.pincodeLabel')}
            required
            error={getModalErrorMessage(modalErrors.pincode?.message)}
            placeholder={t('restaurantSelect.pincodePlaceholder')}
            {...register('pincode')}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('restaurantSelect.phoneLabel')}
              error={getModalErrorMessage(modalErrors.contact_phone?.message)}
              placeholder="+91-9876543210"
              {...register('contact_phone')}
            />

            <Input
              label={t('restaurantSelect.emailLabel')}
              type="email"
              error={getModalErrorMessage(modalErrors.contact_email?.message)}
              placeholder="info@restaurant.com"
              {...register('contact_email')}
            />
          </div>

          <Textarea
            label={t('restaurantSelect.descLabel')}
            rows={2}
            error={getModalErrorMessage(modalErrors.description?.message)}
            placeholder={t('restaurantSelect.descPlaceholder')}
            {...register('description')}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={createRestaurant.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit(onAddRestaurantSubmit)}
              isLoading={createRestaurant.isPending}
            >
              {t('restaurantSelect.addAndSelect')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
