import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n/LanguageContext'
import { registerSchema, type RegisterFormValues } from '@/lib/schemas'
import { NATIVE_LANGUAGE_LABELS } from '@/types/user'
import { toApiError } from '@/types/errors'

export default function Register() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const { t, language } = useTranslation()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    // Strictly initialize all user fields to empty strings — no prefill
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      phone: '',
      preferred_language: language,
    },
  })

  // Explicitly reset on mount or when language changes
  useEffect(() => {
    reset({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      phone: '',
      preferred_language: language,
    })
  }, [reset, language])

  async function onSubmit(values: RegisterFormValues) {
    setFormError(null)
    try {
      await registerUser(values)
      // Navigate to login with accountCreated indicator, but NEVER pass user credentials or email
      navigate('/login', { replace: true, state: { accountCreated: true } })
    } catch (error) {
      setFormError(toApiError(error).message)
    }
  }

  return (
    <AuthLayout title={t('auth.register.title')} subtitle={t('auth.register.subtitle')}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate autoComplete="off" className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('auth.register.firstName')}
            required
            autoComplete="given-name"
            error={errors.first_name?.message}
            {...register('first_name')}
          />
          <Input
            label={t('auth.register.lastName')}
            required
            autoComplete="family-name"
            error={errors.last_name?.message}
            {...register('last_name')}
          />
        </div>
        <Input
          label={t('auth.register.email')}
          type="email"
          autoComplete="username"
          required
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label={t('auth.register.password')}
          type="password"
          autoComplete="new-password"
          required
          hint={t('auth.register.passwordHint')}
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label={t('auth.register.phone')}
          type="tel"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Select
          label={t('auth.register.preferredLanguage')}
          error={errors.preferred_language?.message}
          {...register('preferred_language')}
        >
          {Object.entries(NATIVE_LANGUAGE_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </Select>
        {formError && (
          <p role="alert" className="text-sm text-danger-600">
            {formError}
          </p>
        )}
        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          {t('auth.register.submit')}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-500">
        {t('auth.register.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-primary-700 hover:underline">
          {t('auth.register.signIn')}
        </Link>
      </p>
    </AuthLayout>
  )
}
