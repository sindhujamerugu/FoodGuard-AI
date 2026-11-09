import { useMemo, useState } from 'react'
import { Building2, CheckCircle2, Clock, Plus, Search, Store } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { RestaurantCard } from '@/components/restaurants/RestaurantCard'
import { Reveal } from '@/components/motion/Reveal'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { ListSkeleton } from '@/components/states/LoadingSkeleton'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LinkButton } from '@/components/ui/LinkButton'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/context/AuthContext'
import { useClaimRestaurant, useRestaurants } from '@/hooks/useRestaurants'
import { toApiError } from '@/types/errors'
import type { Restaurant } from '@/types/restaurant'

export default function RestaurantDashboard() {
  const { user } = useAuth()
  const { data, isLoading, isError, isSuccess, refetch } = useRestaurants()
  const claimMutation = useClaimRestaurant()

  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)
  const [claimSearch, setClaimSearch] = useState('')
  const [claimingId, setClaimingId] = useState<number | null>(null)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null)

  const myRestaurants = useMemo(
    () => (data ?? []).filter((r) => r.owner?.id === user?.id),
    [data, user?.id],
  )

  const pendingClaims = useMemo(
    () => (data ?? []).filter((r) => r.claimed_by?.id === user?.id && r.claim_status === 'PENDING'),
    [data, user?.id],
  )

  const unclaimedRestaurants = useMemo(() => {
    const list = (data ?? []).filter((r) => !r.owner && r.claim_status !== 'PENDING')
    const term = claimSearch.trim().toLowerCase()
    if (!term) return list
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        r.city.toLowerCase().includes(term) ||
        r.address.toLowerCase().includes(term),
    )
  }, [data, claimSearch])

  async function handleClaim(restaurant: Restaurant) {
    setClaimError(null)
    setClaimSuccess(null)
    setClaimingId(restaurant.id)
    try {
      await claimMutation.mutateAsync(restaurant.id)
      setClaimSuccess(`Claim submitted for "${restaurant.name}". Awaiting reviewer approval.`)
      setTimeout(() => {
        setIsClaimModalOpen(false)
        setClaimSuccess(null)
      }, 1500)
    } catch (err) {
      setClaimError(toApiError(err).message)
    } finally {
      setClaimingId(null)
    }
  }

  return (
    <AppShell title="My Restaurants">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">My Restaurants</h2>
          <p className="mt-1 text-sm text-neutral-500">Manage the restaurants you own on FoodGuard AI.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setClaimError(null)
              setClaimSuccess(null)
              setIsClaimModalOpen(true)
            }}
          >
            <Store className="size-4" aria-hidden="true" />
            Claim Existing Restaurant
          </Button>
          <LinkButton to="/restaurant/new">
            <Plus className="size-4" aria-hidden="true" />
            Add Restaurant
          </LinkButton>
        </div>
      </div>

      {isLoading && <ListSkeleton items={3} />}
      {isError && <ErrorState message="We couldn't load your restaurants." onRetry={() => refetch()} />}

      {/* Pending Claims Section */}
      {pendingClaims.length > 0 && (
        <div className="mb-8 rounded-2xl border border-amber-200/70 bg-amber-50/40 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-amber-600" aria-hidden="true" />
              <h3 className="text-base font-semibold text-amber-900">Pending Ownership Claims</h3>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              {pendingClaims.length} pending
            </span>
          </div>
          <p className="mb-4 text-xs text-amber-800/80">
            You have submitted claim requests for the following restaurants. They will move to your verified restaurants once approved by a reviewer.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingClaims.map((r, i) => (
              <Reveal key={r.id} delay={i * 60}>
                <RestaurantCard restaurant={r} />
              </Reveal>
            ))}
          </div>
        </div>
      )}

      {/* Owned Restaurants Section */}
      {isSuccess && myRestaurants.length === 0 && pendingClaims.length === 0 && (
        <EmptyState
          icon={<Building2 className="size-6" aria-hidden="true" />}
          title="No restaurants yet"
          description="Register your restaurant or claim an existing one on FoodGuard AI."
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsClaimModalOpen(true)}>
                Claim Existing
              </Button>
              <LinkButton to="/restaurant/new" size="sm">
                Add Restaurant
              </LinkButton>
            </div>
          }
        />
      )}

      {myRestaurants.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myRestaurants.map((r, i) => (
            <Reveal key={r.id} delay={i * 60}>
              <RestaurantCard restaurant={r} />
            </Reveal>
          ))}
        </div>
      )}

      {isSuccess && myRestaurants.length > 0 && (
        <p className="mt-6 text-xs text-neutral-400">
          Note: only active restaurants are shown here. A restaurant you deactivate will no longer appear in this
          list until reactivated.
        </p>
      )}

      {/* Claim Modal */}
      <Modal
        open={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        title="Claim an Unclaimed Restaurant"
        description="Search for community-added or unclaimed restaurants to request verified ownership."
        size="lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
            <Input
              placeholder="Search by restaurant name, address, or city"
              className="pl-9"
              value={claimSearch}
              onChange={(e) => setClaimSearch(e.target.value)}
            />
          </div>

          {claimError && (
            <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger-700">
              {claimError}
            </p>
          )}

          {claimSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-success-50 px-3 py-2 text-xs text-success-700">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              <span>{claimSuccess}</span>
            </div>
          )}

          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {unclaimedRestaurants.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-500">
                No unclaimed restaurants found matching your query.
              </p>
            ) : (
              unclaimedRestaurants.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-neutral-100 p-3.5 transition-colors hover:bg-neutral-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-neutral-900">{r.name}</p>
                    <p className="truncate text-xs text-neutral-500">
                      {r.address}, {r.city}, {r.state} {r.pincode}
                    </p>
                    {r.contact_phone && (
                      <p className="text-xs text-neutral-400">Phone: {r.contact_phone}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    isLoading={claimingId === r.id}
                    onClick={() => handleClaim(r)}
                  >
                    Claim Ownership
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}

