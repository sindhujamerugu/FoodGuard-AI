import type { ReactNode } from 'react'

export function SectionHeader({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      {action}
    </div>
  )
}
