import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  User as UserIcon,
  Mail,
  Phone,
  ShieldCheck,
  Globe,
  Calendar,
  CheckCircle2,
  Pencil,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { RoleBadge } from '@/components/badges/RoleBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api/auth'
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from '@/lib/queryKeys'
import { profileSchema, type ProfileFormValues } from '@/lib/schemas'
import { formatDate, initials } from '@/lib/format'
import { toApiError } from '@/types/errors'
import {
  LANGUAGE_LABELS,
  NATIVE_LANGUAGE_LABELS,
  type LanguageCode,
} from '@/types/user'
import {
  useTranslation,
  SUPPORTED_UI_LANGUAGES,
  type TranslationKey,
  type UiLanguage,
} from '@/i18n'

const LANGUAGE_KEYS: Record<string, TranslationKey> = {
  en: 'language.en',
  te: 'language.te',
  hi: 'language.hi',
  ta: 'language.ta',
  kn: 'language.kn',
  mr: 'language.mr',
}

const ROLE_KEYS: Record<string, TranslationKey> = {
  CUSTOMER: 'role.customer',
  RESTAURANT_USER: 'role.restaurant',
  REVIEWER: 'role.reviewer',
  ADMIN: 'role.admin',
}

export default function Profile() {
  const { user, updateUser } = useAuth()
  const { t, language, setLanguage } = useTranslation()

  const [isEditing, setIsEditing] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      phone: user?.phone ?? '',
      preferred_language: (user?.preferred_language as UiLanguage) ?? 'en',
    },
  })

  if (!user) return null

  const langKey = LANGUAGE_KEYS[user.preferred_language]
  const preferredLangDisplay = langKey
    ? t(langKey)
    : (LANGUAGE_LABELS[user.preferred_language] ?? user.preferred_language)

  const roleKey = ROLE_KEYS[user.role]
  const roleLabel = roleKey ? t(roleKey) : user.role

  function handleOpenEdit() {
    setModalError(null)
    setSuccessMessage(null)
    reset({
      first_name: user!.first_name,
      last_name: user!.last_name,
      phone: user!.phone || '',
      preferred_language: user!.preferred_language as UiLanguage,
    })
    setIsEditing(true)
  }

  function handleCloseModal() {
    if (isSubmitting) return
    setIsEditing(false)
    setModalError(null)
    reset({
      first_name: user!.first_name,
      last_name: user!.last_name,
      phone: user!.phone || '',
      preferred_language: user!.preferred_language as UiLanguage,
    })
  }

  async function onSubmit(values: ProfileFormValues) {
    setModalError(null)
    try {
      const updated = await authApi.updateProfile({
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        phone: values.phone?.trim() ?? '',
        preferred_language: values.preferred_language as LanguageCode,
      })

      // Sync AuthContext state
      updateUser?.(updated)

      // Sync React Query cache
      queryClient.setQueryData(queryKeys.auth.profile, updated)

      // Immediately synchronize UI language if changed
      if (updated.preferred_language !== language) {
        setLanguage(updated.preferred_language as UiLanguage)
      }

      setIsEditing(false)
      setSuccessMessage(t('profile.updateSuccess'))
    } catch (err) {
      setModalError(toApiError(err).message || t('profile.updateError'))
    }
  }

  const personalFields = [
    {
      icon: UserIcon,
      label: t('profile.fullName'),
      value: `${user.first_name} ${user.last_name}`,
    },
    {
      icon: Mail,
      label: t('profile.email'),
      value: user.email,
    },
    {
      icon: Phone,
      label: t('profile.phone'),
      value: user.phone || t('profile.notProvided'),
    },
    {
      icon: ShieldCheck,
      label: t('profile.role'),
      value: roleLabel,
    },
  ]

  const accountFields = [
    {
      icon: Globe,
      label: t('profile.preferredLanguage'),
      value: preferredLangDisplay,
    },
    {
      icon: Calendar,
      label: t('profile.memberSince'),
      value: formatDate(user.date_joined, language),
    },
    {
      icon: CheckCircle2,
      label: t('profile.accountStatus'),
      value: t('common.active'),
    },
  ]

  return (
    <AppShell title={t('profile.title')}>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{t('profile.title')}</h1>
            <p className="mt-1 text-sm text-neutral-500">{t('profile.subtitle')}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenEdit}
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            <Pencil className="size-4 text-neutral-500" aria-hidden="true" />
            <span>{t('profile.editProfile')}</span>
          </Button>
        </div>

        {/* Success Banner */}
        {successMessage && (
          <div
            role="status"
            className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle className="size-4.5 text-emerald-600 shrink-0" aria-hidden="true" />
              <span className="font-medium">{successMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="rounded-md p-1 text-emerald-600 hover:bg-emerald-100"
              aria-label="Dismiss message"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Profile Header Card */}
        <section
          aria-label={t('profile.title')}
          className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-card transition-all sm:p-7"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 sm:gap-5">
              <div
                className="flex size-18 shrink-0 items-center justify-center rounded-full bg-primary-700 text-xl font-semibold text-white shadow-xs ring-4 ring-primary-50 select-none sm:size-20 sm:text-2xl"
                aria-hidden="true"
              >
                {initials(user.first_name, user.last_name)}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold tracking-tight text-neutral-900 sm:text-xl">
                  {user.first_name} {user.last_name}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <RoleBadge role={user.role} />
                  <span className="text-xs font-medium text-neutral-300" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-xs font-medium text-neutral-500">{roleLabel}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 shadow-2xs">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                {t('common.active')}
              </span>
            </div>
          </div>
        </section>

        {/* Personal Information */}
        <section
          aria-labelledby="personal-info-heading"
          className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-card sm:p-7"
        >
          <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-4">
            <UserIcon className="size-4.5 text-neutral-400" aria-hidden="true" />
            <h2 id="personal-info-heading" className="text-base font-semibold text-neutral-900">
              {t('profile.personalInfo')}
            </h2>
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {personalFields.map((field) => (
              <div
                key={field.label}
                className="flex items-start gap-3.5 rounded-xl border border-neutral-100 bg-neutral-50/50 p-4 transition-colors duration-150 hover:border-neutral-200/70 hover:bg-neutral-50"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200/70 bg-white text-neutral-500 shadow-2xs">
                  <field.icon className="size-4 text-neutral-500" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium text-neutral-400">{field.label}</dt>
                  <dd className="mt-0.5 truncate text-sm font-semibold text-neutral-900">{field.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>

        {/* Account Details */}
        <section
          aria-labelledby="account-details-heading"
          className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-card sm:p-7"
        >
          <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-4">
            <CheckCircle2 className="size-4.5 text-neutral-400" aria-hidden="true" />
            <h2 id="account-details-heading" className="text-base font-semibold text-neutral-900">
              {t('profile.accountDetails')}
            </h2>
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accountFields.map((field) => (
              <div
                key={field.label}
                className="flex items-start gap-3.5 rounded-xl border border-neutral-100 bg-neutral-50/50 p-4 transition-colors duration-150 hover:border-neutral-200/70 hover:bg-neutral-50"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200/70 bg-white text-neutral-500 shadow-2xs">
                  <field.icon className="size-4 text-neutral-500" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium text-neutral-400">{field.label}</dt>
                  <dd className="mt-0.5 truncate text-sm font-semibold text-neutral-900">{field.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>

        {/* Managed Notice */}
        <p className="pt-1 text-center text-xs text-neutral-400">
          {t('profile.managedNotice')}
        </p>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <Modal
          open={isEditing}
          onClose={handleCloseModal}
          title={t('profile.editDialogTitle')}
          description={t('profile.editDialogDescription')}
          size="md"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {modalError && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700"
              >
                <AlertCircle className="size-4 shrink-0 text-danger-600" aria-hidden="true" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="profile-first-name"
                label={t('profile.firstName')}
                required
                disabled={isSubmitting}
                error={errors.first_name?.message}
                {...register('first_name')}
              />
              <Input
                id="profile-last-name"
                label={t('profile.lastName')}
                required
                disabled={isSubmitting}
                error={errors.last_name?.message}
                {...register('last_name')}
              />
            </div>

            <Input
              id="profile-phone"
              label={t('profile.phone')}
              placeholder="+91 9876543210"
              disabled={isSubmitting}
              error={errors.phone?.message}
              {...register('phone')}
            />

            <Select
              id="profile-language"
              label={t('profile.preferredLanguage')}
              required
              disabled={isSubmitting}
              error={errors.preferred_language?.message}
              {...register('preferred_language')}
            >
              {SUPPORTED_UI_LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {NATIVE_LANGUAGE_LABELS[code]} ({LANGUAGE_LABELS[code]})
                </option>
              ))}
            </Select>

            {/* Read-only Security Notice & Fields */}
            <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/80 p-3.5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-600">
                <ShieldCheck className="size-4 text-neutral-500 shrink-0" aria-hidden="true" />
                <span>{t('profile.readOnlyNotice')}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <span className="font-medium text-neutral-400">{t('profile.email')}</span>
                  <p className="mt-0.5 truncate font-semibold text-neutral-700">{user.email}</p>
                </div>
                <div>
                  <span className="font-medium text-neutral-400">{t('profile.role')}</span>
                  <p className="mt-0.5 font-semibold text-neutral-700">{roleLabel}</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={handleCloseModal}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                {isSubmitting ? t('profile.saving') : t('profile.saveChanges')}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  )
}
