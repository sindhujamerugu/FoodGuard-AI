import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Reveal } from '@/components/motion/Reveal'
import { LanguageSelector } from '@/components/layout/LanguageSelector'
import { useTranslation } from '@/i18n/LanguageContext'

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen">
      {/* Decorative Brand Panel (Desktop) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary-900 p-12 text-white lg:flex">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.12), transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.08), transparent 50%)',
          }}
          aria-hidden="true"
        />
        <div className="absolute -left-12 top-1/3 size-64 rounded-full bg-primary-500/20 blur-3xl animate-float" aria-hidden="true" />
        <Link to="/" className="relative flex items-center gap-2">
          <ShieldCheck className="size-7" aria-hidden="true" />
          <span className="text-lg font-semibold">FoodGuard AI</span>
        </Link>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">
            {t('auth.banner.headline')}
          </h2>
          <p className="mt-4 text-sm text-primary-100">
            {t('auth.banner.description')}
          </p>
        </div>
        <p className="relative text-xs text-primary-200">© {new Date().getFullYear()} FoodGuard AI</p>
      </div>

      {/* Main Auth Form Container */}
      <div className="flex w-full flex-col justify-between px-6 py-6 sm:px-12 lg:w-1/2 lg:px-16 min-h-screen">
        {/* Top bar with pre-auth language selector */}
        <div className="flex items-center justify-between w-full">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <ShieldCheck className="size-6 text-primary-700" aria-hidden="true" />
            <span className="text-lg font-semibold text-neutral-900">FoodGuard AI</span>
          </Link>
          <div className="ml-auto">
            <LanguageSelector variant="outline" />
          </div>
        </div>

        {/* Center content */}
        <div className="mx-auto w-full max-w-sm my-auto py-8">
          <Reveal variant="fade">
            <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
            <p className="mt-1.5 text-sm text-neutral-500">{subtitle}</p>
          </Reveal>
          <Reveal delay={100}>
            <div className="mt-8">{children}</div>
          </Reveal>
        </div>

        {/* Bottom spacer for vertical balance */}
        <div className="h-6" aria-hidden="true" />
      </div>
    </div>
  )
}
