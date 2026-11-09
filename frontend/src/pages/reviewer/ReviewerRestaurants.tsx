import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  Search,
  ShieldCheck,
  Store,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { RestaurantTable } from '@/components/restaurants/RestaurantTable'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { TableSkeleton } from '@/components/states/LoadingSkeleton'
import { Input } from '@/components/ui/Input'
import { ConfirmationModal } from '@/components/reviewer/ConfirmationModal'
import { restaurantsApi } from '@/api/restaurants'
import { useRestaurants } from '@/hooks/useRestaurants'
import { queryClient } from '@/lib/queryClient'
import { queryKeys } from '@/lib/queryKeys'
import { toApiError } from '@/types/errors'
import type { Restaurant } from '@/types/restaurant'

export default function ReviewerRestaurants() {
  const { data, isLoading, isError, isSuccess, refetch } = useRestaurants()
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'pending_claims' | 'unclaimed' | 'verified'>('all')
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Confirmation modal state
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string
    message: string
    tone: 'danger' | 'primary' | 'warning'
    onConfirm: () => Promise<void>
  } | null>(null)

  const restaurants = useMemo(() => data ?? [], [data])

  // Real KPI statistics
  const pendingClaimsCount = useMemo(() => {
    return restaurants.filter((r) => r.claim_status === 'PENDING' && !r.owner).length
  }, [restaurants])

  const unclaimedCount = useMemo(() => {
    return restaurants.filter((r) => !r.owner && r.claim_status !== 'PENDING').length
  }, [restaurants])

  const verifiedCount = useMemo(() => {
    return restaurants.filter((r) => r.is_verified).length
  }, [restaurants])

  const activeCount = useMemo(() => {
    return restaurants.filter((r) => r.is_active).length
  }, [restaurants])

  const filtered = useMemo(() => {
    let list = restaurants

    if (filterTab === 'pending_claims') {
      list = list.filter((r) => r.claim_status === 'PENDING' && !r.owner)
    } else if (filterTab === 'unclaimed') {
      list = list.filter((r) => !r.owner && r.claim_status !== 'PENDING')
    } else if (filterTab === 'verified') {
      list = list.filter((r) => r.is_verified)
    }

    const term = search.trim().toLowerCase()
    if (!term) return list
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        r.city.toLowerCase().includes(term) ||
        (r.owner && `${r.owner.first_name} ${r.owner.last_name}`.toLowerCase().includes(term)) ||
        (r.claimed_by && `${r.claimed_by.first_name} ${r.claimed_by.last_name}`.toLowerCase().includes(term)),
    )
  }, [restaurants, search, filterTab])

  async function toggle(restaurant: Restaurant, field: 'is_verified' | 'is_active') {
    setActionError(null)
    setActionSuccess(null)
    setPendingId(restaurant.id)
    try {
      const updated = await restaurantsApi.update(restaurant.id, { [field]: !restaurant[field] })
      queryClient.setQueryData(queryKeys.restaurants.detail(restaurant.id), updated)
      void queryClient.invalidateQueries({ queryKey: queryKeys.restaurants.all })
      setActionSuccess(
        `Updated "${restaurant.name}": ${field === 'is_verified' ? (updated.is_verified ? 'Verified' : 'Unverified') : updated.is_active ? 'Activated' : 'Deactivated'}.`,
      )
    } catch (error) {
      setActionError(toApiError(error).message)
    } finally {
      setPendingId(null)
    }
  }

  function promptApproveClaim(restaurant: Restaurant) {
    const applicantName = restaurant.claimed_by
      ? `${restaurant.claimed_by.first_name} ${restaurant.claimed_by.last_name} (${restaurant.claimed_by.email})`
      : 'the applicant'

    setConfirmConfig({
      title: 'Approve Ownership Claim',
      message: `Are you sure you want to approve the ownership claim for "${restaurant.name}" submitted by ${applicantName}? This grants restaurant owner management access.`,
      tone: 'primary',
      onConfirm: async () => {
        setActionError(null)
        setActionSuccess(null)
        setPendingId(restaurant.id)
        try {
          const updated = await restaurantsApi.approveClaim(restaurant.id)
          queryClient.setQueryData(queryKeys.restaurants.detail(restaurant.id), updated)
          void queryClient.invalidateQueries({ queryKey: queryKeys.restaurants.all })
          setActionSuccess(`Successfully approved ownership claim for "${restaurant.name}".`)
          setConfirmConfig(null)
        } catch (error) {
          setActionError(toApiError(error).message)
        } finally {
          setPendingId(null)
        }
      },
    })
  }

  function promptRejectClaim(restaurant: Restaurant) {
    const applicantName = restaurant.claimed_by
      ? `${restaurant.claimed_by.first_name} ${restaurant.claimed_by.last_name} (${restaurant.claimed_by.email})`
      : 'the applicant'

    setConfirmConfig({
      title: 'Reject Ownership Claim',
      message: `Are you sure you want to reject the ownership claim for "${restaurant.name}" submitted by ${applicantName}? This restaurant will return to unclaimed status.`,
      tone: 'danger',
      onConfirm: async () => {
        setActionError(null)
        setActionSuccess(null)
        setPendingId(restaurant.id)
        try {
          const updated = await restaurantsApi.rejectClaim(restaurant.id)
          queryClient.setQueryData(queryKeys.restaurants.detail(restaurant.id), updated)
          void queryClient.invalidateQueries({ queryKey: queryKeys.restaurants.all })
          setActionSuccess(`Rejected ownership claim for "${restaurant.name}".`)
          setConfirmConfig(null)
        } catch (error) {
          setActionError(toApiError(error).message)
        } finally {
          setPendingId(null)
        }
      },
    })
  }

  return (
    <AppShell title="Restaurant Verification">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-600" />
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">
              Restaurant Verification & Claims
            </h1>
          </div>
          <p className="mt-1 text-sm text-neutral-600">
            Review ownership claim requests, verify restaurants, and manage their platform active status.
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Pending Claims */}
        <button
          type="button"
          onClick={() => setFilterTab('pending_claims')}
          className={`text-left cursor-pointer rounded-xl border p-3.5 shadow-card transition-all ${
            filterTab === 'pending_claims'
              ? 'border-amber-400 bg-amber-50/50 ring-2 ring-amber-300'
              : 'border-neutral-200 bg-white hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Pending Claims
            </span>
            <AlertTriangle className="size-4 text-amber-600" />
          </div>
          <p className="mt-1 text-2xl font-bold text-amber-700">{pendingClaimsCount}</p>
        </button>

        {/* Unclaimed */}
        <button
          type="button"
          onClick={() => setFilterTab('unclaimed')}
          className={`text-left cursor-pointer rounded-xl border p-3.5 shadow-card transition-all ${
            filterTab === 'unclaimed'
              ? 'border-primary-400 bg-primary-50/50 ring-2 ring-primary-300'
              : 'border-neutral-200 bg-white hover:border-neutral-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Unclaimed Listings
            </span>
            <Store className="size-4 text-neutral-500" />
          </div>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{unclaimedCount}</p>
        </button>

        {/* Verified */}
        <button
          type="button"
          onClick={() => setFilterTab('verified')}
          className={`text-left cursor-pointer rounded-xl border p-3.5 shadow-card transition-all ${
            filterTab === 'verified'
              ? 'border-success-400 bg-success-50/50 ring-2 ring-success-300'
              : 'border-neutral-200 bg-white hover:border-neutral-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Verified Establishments
            </span>
            <ShieldCheck className="size-4 text-success-600" />
          </div>
          <p className="mt-1 text-2xl font-bold text-success-700">{verifiedCount}</p>
        </button>

        {/* Active Listings */}
        <button
          type="button"
          onClick={() => setFilterTab('all')}
          className={`text-left cursor-pointer rounded-xl border p-3.5 shadow-card transition-all ${
            filterTab === 'all'
              ? 'border-neutral-400 bg-neutral-50 ring-2 ring-neutral-300'
              : 'border-neutral-200 bg-white hover:border-neutral-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Active Listings
            </span>
            <Building2 className="size-4 text-primary-700" />
          </div>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{activeCount}</p>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <Input
            placeholder="Search by restaurant name, city, or applicant..."
            className="pl-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-neutral-100 p-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              filterTab === 'all'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            All ({restaurants.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('pending_claims')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
              filterTab === 'pending_claims'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Pending Claims
            {pendingClaimsCount > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-semibold text-white">
                {pendingClaimsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('unclaimed')}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              filterTab === 'unclaimed'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Unclaimed ({unclaimedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('verified')}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              filterTab === 'verified'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Verified ({verifiedCount})
          </button>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="mb-4 rounded-xl bg-danger-50 px-4 py-3 text-xs text-danger-700 border border-danger-200">
          {actionError}
        </p>
      )}

      {actionSuccess && (
        <p role="status" className="mb-4 rounded-xl bg-success-50 px-4 py-3 text-xs text-success-700 border border-success-200">
          {actionSuccess}
        </p>
      )}

      {isLoading && <TableSkeleton rows={6} />}
      {isError && <ErrorState message="Could not load restaurants." onRetry={() => refetch()} />}
      {isSuccess && filtered.length === 0 && (
        <EmptyState
          title="No matching restaurants"
          description={
            filterTab === 'pending_claims'
              ? 'There are no pending restaurant ownership claims at this time.'
              : 'Try adjusting your search query or switching tabs.'
          }
        />
      )}

      {filtered.length > 0 && (
        <RestaurantTable
          restaurants={filtered}
          pendingId={pendingId}
          onToggleVerified={(r) => toggle(r, 'is_verified')}
          onToggleActive={(r) => toggle(r, 'is_active')}
          onApproveClaim={promptApproveClaim}
          onRejectClaim={promptRejectClaim}
        />
      )}

      <p className="mt-6 text-xs text-neutral-400">
        Reviewer Note: Restaurant verification verifies the establishment profile on FoodGuard AI. Approving a claim assigns business ownership to the verified applicant.
      </p>

      {/* Confirmation Modal for Approving Claims */}
      {confirmConfig && (
        <ConfirmationModal
          isOpen={Boolean(confirmConfig)}
          title={confirmConfig.title}
          message={confirmConfig.message}
          tone={confirmConfig.tone}
          isLoading={Boolean(pendingId)}
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmConfig(null)}
        />
      )}
    </AppShell>
  )
}
