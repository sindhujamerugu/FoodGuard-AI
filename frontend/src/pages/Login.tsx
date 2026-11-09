import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n/LanguageContext'
import { loginSchema, type LoginFormValues } from '@/lib/schemas'
import { defaultRouteForRole } from '@/lib/roles'
import { toApiError } from '@/types/errors'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const t = useTranslation()
  const [formError, setFormError] = useState<string | null>(null)

  // Anti-autofill: start fields in readOnly mode so Chrome password manager ignores them on initial page load
  const [emailReadOnly, setEmailReadOnly] = useState(true)
  const [passwordReadOnly, setPasswordReadOnly] = useState(true)

  const emailInputRef = useRef<HTMLInputElement | null>(null)
  const passwordInputRef = useRef<HTMLInputElement | null>(null)

  const accountCreated = Boolean((location.state as { accountCreated?: boolean } | null)?.accountCreated)
  const from = (location.state as { from?: Location } | null)?.from

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    // Strictly initialize to empty strings — never pre-populate from storage, location, or URL
    defaultValues: { email: '', password: '' },
  })

  // Explicitly reset form fields and DOM values to empty on mount or navigation
  useEffect(() => {
    reset({ email: '', password: '' })
    if (emailInputRef.current) {
      emailInputRef.current.value = ''
    }
    if (passwordInputRef.current) {
      passwordInputRef.current.value = ''
    }

    // Safeguard against aggressive asynchronous autofill runs right after initial mount
    const timer = setTimeout(() => {
      if (emailInputRef.current?.readOnly && emailInputRef.current.value) {
        emailInputRef.current.value = ''
      }
      if (passwordInputRef.current?.readOnly && passwordInputRef.current.value) {
        passwordInputRef.current.value = ''
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [reset, location.key])

  const unlockEmail = (target?: HTMLInputElement | null) => {
    setEmailReadOnly(false)
    if (target) target.readOnly = false
    if (emailInputRef.current) emailInputRef.current.readOnly = false
  }

  const unlockPassword = (target?: HTMLInputElement | null) => {
    setPasswordReadOnly(false)
    if (target) target.readOnly = false
    if (passwordInputRef.current) passwordInputRef.current.readOnly = false
  }

  const { ref: emailFormRef, ...emailRegister } = register('email')
  const { ref: passwordFormRef, ...passwordRegister } = register('password')

  async function onSubmit(values: LoginFormValues) {
    setFormError(null)
    try {
      const user = await login(values)
      const target = from ? `${from.pathname}${from.search}` : defaultRouteForRole(user.role)
      navigate(target, { replace: true })
    } catch (error) {
      setFormError(toApiError(error).message)
    }
  }

  return (
    <AuthLayout title={t('auth.login.title')} subtitle={t('auth.login.subtitle')}>
      {accountCreated && (
        <p className="mb-4 rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700">
          {t('auth.login.accountCreated')}
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate autoComplete="off" className="space-y-4">
        <Input
          label={t('auth.login.email')}
          type="email"
          autoComplete="off"
          required
          readOnly={emailReadOnly}
          error={errors.email?.message}
          {...emailRegister}
          ref={(el) => {
            emailInputRef.current = el
            emailFormRef(el)
          }}
          onFocus={(e) => unlockEmail(e.currentTarget)}
          onClick={(e) => unlockEmail(e.currentTarget)}
          onKeyDown={(e) => unlockEmail(e.currentTarget)}
        />
        <Input
          label={t('auth.login.password')}
          type="password"
          autoComplete="off"
          required
          readOnly={passwordReadOnly}
          error={errors.password?.message}
          {...passwordRegister}
          ref={(el) => {
            passwordInputRef.current = el
            passwordFormRef(el)
          }}
          onFocus={(e) => unlockPassword(e.currentTarget)}
          onClick={(e) => unlockPassword(e.currentTarget)}
          onKeyDown={(e) => unlockPassword(e.currentTarget)}
        />
        {formError && (
          <p role="alert" className="text-sm text-danger-600">
            {formError}
          </p>
        )}
        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          {t('auth.login.submit')}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-500">
        {t('auth.login.noAccount')}{' '}
        <Link to="/register" className="font-medium text-primary-700 hover:underline">
          {t('auth.login.createOne')}
        </Link>
      </p>
    </AuthLayout>
  )
}
