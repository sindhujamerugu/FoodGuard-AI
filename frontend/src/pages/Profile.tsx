import { Mail, Phone, Calendar, Globe } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { RoleBadge } from '@/components/badges/RoleBadge'
import { useAuth } from '@/context/AuthContext'
import { LANGUAGE_LABELS } from '@/types/user'
import { formatDate } from '@/lib/format'
import { initials } from '@/lib/format'

export default function Profile() {
  const { user } = useAuth()
  if (!user) return null

  const fields = [
    { icon: Mail, label: 'Email', value: user.email },
    { icon: Phone, label: 'Phone', value: user.phone || 'Not provided' },
    { icon: Globe, label: 'Preferred language', value: LANGUAGE_LABELS[user.preferred_language] },
    { icon: Calendar, label: 'Member since', value: formatDate(user.date_joined) },
  ]

  return (
    <AppShell title="Profile">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary-700 text-lg font-semibold text-white">
              {initials(user.first_name, user.last_name)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                {user.first_name} {user.last_name}
              </h2>
              <RoleBadge role={user.role} className="mt-1" />
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-neutral-100 pt-6 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.label} className="flex items-start gap-3">
                <field.icon className="mt-0.5 size-4 shrink-0 text-neutral-400" aria-hidden="true" />
                <div>
                  <dt className="text-xs text-neutral-400">{field.label}</dt>
                  <dd className="text-sm font-medium text-neutral-800">{field.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        <p className="mt-4 text-center text-xs text-neutral-400">
          Profile details are managed by FoodGuard AI administrators and can't be edited here yet.
        </p>
      </div>
    </AppShell>
  )
}
