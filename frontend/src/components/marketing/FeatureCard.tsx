import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-neutral-100 bg-white p-6 shadow-card transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-primary-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative mb-4 flex size-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700 transition-transform duration-300 group-hover:-translate-y-0.5">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h3 className="relative text-base font-semibold text-neutral-900">{title}</h3>
      <p className="relative mt-1.5 text-sm text-neutral-500">{description}</p>
      <div className="relative mt-4 flex items-center gap-1 text-sm font-medium text-primary-700 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
        Learn more
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </div>
    </div>
  )
}
