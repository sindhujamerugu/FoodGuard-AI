import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Reveal } from '@/components/motion/Reveal'

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen">
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
            Report food safety concerns. Get them reviewed. Keep restaurants accountable.
          </h2>
          <p className="mt-4 text-sm text-primary-100">
            A civic platform connecting customers, restaurants, and reviewers to keep food safety
            transparent — backed by preliminary AI visual assessment.
          </p>
        </div>
        <p className="relative text-xs text-primary-200">© {new Date().getFullYear()} FoodGuard AI</p>
      </div>

      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <ShieldCheck className="size-6 text-primary-700" aria-hidden="true" />
            <span className="text-lg font-semibold text-neutral-900">FoodGuard AI</span>
          </Link>
          <Reveal variant="fade">
            <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
            <p className="mt-1.5 text-sm text-neutral-500">{subtitle}</p>
          </Reveal>
          <Reveal delay={100}>
            <div className="mt-8">{children}</div>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
