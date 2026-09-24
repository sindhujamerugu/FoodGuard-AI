import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { RestaurantTable } from '@/components/restaurants/RestaurantTable'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { TableSkeleton } from '@/components/states/LoadingSkeleton'
import { Input } from '@/components/ui/Input'
import { restaurantsApi } from '@/api/restaurants'
import { useRestaurants } from '@/hooks/useRestaurants'
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from '@/lib/queryKeys'
import { toApiError } from '@/types/errors'
import type { Restaurant } from '@/types/restaurant'

export default function ReviewerRestaurants() {
  const { data, isLoading, isError, isSuccess, refetch } = useRestaurants()
  const [search, setSearch] = useState('')
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const all = data ?? []
    const term = search.trim().toLowerCase()
    if (!term) return all
    return all.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        r.city.toLowerCase().includes(term) ||
        `${r.owner.first_name} ${r.owner.last_name}`.toLowerCase().includes(term),
    )
  }, [data, search])

  async function toggle(restaurant: Restaurant, field: 'is_verified' | 'is_active') {
    setActionError(null)
    setPendingId(restaurant.id)
    try {
      const updated = await restaurantsApi.update(restaurant.id, { [field]: !restaurant[field] })
      queryClient.setQueryData(queryKeys.restaurants.detail(restaurant.id), updated)
      void queryClient.invalidateQueries({ queryKey: queryKeys.restaurants.all })
    } catch (error) {
      setActionError(toApiError(error).message)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <AppShell title="Restaurants">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-neutral-900">Restaurant verification</h2>
        <p className="mt-1 text-sm text-neutral-500">Verify restaurants and manage their active status.</p>
      </div>

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <Input
            placeholder="Search by name, city, or owner"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {actionError && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-50 px-4 py-2.5 text-sm text-danger-700">
          {actionError}
        </p>
      )}

      {isLoading && <TableSkeleton rows={6} />}
      {isError && <ErrorState message="We couldn't load restaurants." onRetry={() => refetch()} />}
      {isSuccess && filtered.length === 0 && (
        <EmptyState title="No matching restaurants" description="Try adjusting your search." />
      )}
      {filtered.length > 0 && (
        <RestaurantTable
          restaurants={filtered}
          pendingId={pendingId}
          onToggleVerified={(r) => toggle(r, 'is_verified')}
          onToggleActive={(r) => toggle(r, 'is_active')}
        />
      )}

      <p className="mt-6 text-xs text-neutral-400">
        Note: restaurants that have been deactivated no longer appear in this list.
      </p>
    </AppShell>
  )
}
