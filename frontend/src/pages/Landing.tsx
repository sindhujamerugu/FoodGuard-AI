import { Link } from 'react-router-dom'
import { Camera, ClipboardCheck, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const FEATURES = [
  {
    icon: Camera,
    title: 'Report with evidence',
    description: 'File a food safety report in minutes with photo evidence of the concern.',
  },
  {
    icon: Sparkles,
    title: 'Preliminary AI assessment',
    description: 'Get an instant, transparent preliminary visual read while your report awaits human review.',
  },
  {
    icon: ClipboardCheck,
    title: 'Track every step',
    description: 'Follow your report and complaint from submission through resolution.',
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-neutral-25">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-7 text-primary-700" aria-hidden="true" />
          <span className="text-lg font-semibold text-neutral-900">FoodGuard AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link to="/register">
            <Button>Get started</Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-6 py-20 text-center">
          <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
            Civic food-safety reporting
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
            Keep food safety transparent — for everyone
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-neutral-500">
            Report food safety concerns, track them through review, and help restaurants stay
            accountable — backed by a preliminary AI visual assessment on every report.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/register">
              <Button size="lg">Create a report</Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                Sign in
              </Button>
            </Link>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                <feature.icon className="size-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900">{feature.title}</h3>
              <p className="mt-1.5 text-sm text-neutral-500">{feature.description}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
