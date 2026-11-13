import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock3, Search } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Input } from '@/components/ui/Input'
import { useReviewerActivity } from '@/hooks/useReviewerActivity'
import { formatDate } from '@/lib/format'

export default function ReviewerActivityPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading, isError } = useReviewerActivity({ page: 1, page_size: 20, search })

  const entries = useMemo(() => data?.results ?? [], [data])

  return (
    <AppShell title="Reviewer Activity">
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary-600" />
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
              Reviewer Activity
            </h1>
          </div>
          <p className="mt-1 text-sm text-neutral-600">
            Immutable audit records for complaint and escalation review activity.
          </p>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit summary or action type"
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500">
          Loading reviewer activity...
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Could not load reviewer activity.
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-500">
          No reviewer activity has been recorded yet.
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const target = entry.complaint
              ? `/reviewer/complaints/${entry.complaint}`
              : entry.escalation
                ? `/reviewer/activity`
                : '/reviewer/activity'

            return (
              <div key={entry.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                      <Clock3 className="size-3.5" />
                      {entry.action_type.replace(/_/g, ' ')}
                    </div>
                    <p className="text-sm font-semibold text-neutral-900">{entry.summary}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Actor: {entry.actor ? `${entry.actor.first_name} ${entry.actor.last_name}` : 'System'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <span>{formatDate(entry.created_at)}</span>
                    <Link
                      to={target}
                      className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 font-medium text-primary-700 hover:border-primary-300 hover:bg-primary-50"
                    >
                      View detail
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
