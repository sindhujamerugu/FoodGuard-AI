import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { registerSchema, type RegisterFormValues } from '@/lib/schemas'
import { LANGUAGE_LABELS } from '@/types/user'
import { toApiError } from '@/types/errors'

export default function Register() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { preferred_language: 'en' },
  })

  async function onSubmit(values: RegisterFormValues) {
    setFormError(null)
    try {
      const result = await registerUser(values)
      navigate('/login', { replace: true, state: { registeredEmail: result.email } })
    } catch (error) {
      setFormError(toApiError(error).message)
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Report food safety concerns in your community">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name" required error={errors.first_name?.message} {...register('first_name')} />
          <Input label="Last name" required error={errors.last_name?.message} {...register('last_name')} />
        </div>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 8 characters."
          error={errors.password?.message}
          {...register('password')}
        />
        <Input label="Phone (optional)" type="tel" error={errors.phone?.message} {...register('phone')} />
        <Select label="Preferred language" error={errors.preferred_language?.message} {...register('preferred_language')}>
          {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
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
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary-700 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
