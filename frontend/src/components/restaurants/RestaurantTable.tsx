import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Reveal } from '@/components/motion/Reveal'
import { useTranslation } from '@/i18n/LanguageContext'
import type { Restaurant } from '@/types/restaurant'

interface RestaurantTableProps {
  restaurants: Restaurant[]
  onToggleVerified: (restaurant: Restaurant) => void
  onToggleActive: (restaurant: Restaurant) => void
  onApproveClaim?: (restaurant: Restaurant) => void
  onRejectClaim?: (restaurant: Restaurant) => void
  pendingId?: number | null
}

export function RestaurantTable({
  restaurants,
  onToggleVerified,
  onToggleActive,
  onApproveClaim,
  onRejectClaim,
  pendingId,
}: RestaurantTableProps) {
  const t = useTranslation()
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-100 bg-white shadow-card">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100 text-xs uppercase tracking-wide text-neutral-400">
            <th className="px-5 py-3 font-medium">Restaurant</th>
            <th className="px-5 py-3 font-medium">Owner / Claim</th>
            <th className="px-5 py-3 font-medium">Location</th>
            <th className="px-5 py-3 font-medium">Verification</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {restaurants.map((r, i) => {
            const isClaimPending = r.claim_status === 'PENDING' && !r.owner
            return (
              <Reveal
                key={r.id}
                as="tr"
                variant="fade"
                delay={i * 40}
                className="border-b border-neutral-50 transition-colors last:border-0 hover:bg-neutral-25"
              >
                <td className="max-w-48 truncate px-5 py-3 font-medium text-neutral-900">{r.name}</td>
                <td className="px-5 py-3 text-neutral-600">
                  {r.owner ? (
                    <span>
                      {r.owner.first_name} {r.owner.last_name}
                    </span>
                  ) : isClaimPending ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="inline-flex w-fit items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        {t('claimStatus.pending')}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {r.claimed_by?.first_name} {r.claimed_by?.last_name}{' '}
                        <span className="text-neutral-400">({r.claimed_by?.email})</span>
                      </span>
                    </div>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                      {t('claimStatus.unclaimed')}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-neutral-600">
                  {r.city}, {r.state}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      r.is_verified ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700',
                    )}
                  >
                    {r.is_verified ? 'Verified' : 'Pending'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      r.is_active ? 'bg-primary-100 text-primary-800' : 'bg-neutral-200 text-neutral-500',
                    )}
                  >
                    {r.is_active ? t('common.active') : t('common.inactive')}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2">
                    {isClaimPending && onApproveClaim && (
                      <Button
                        size="sm"
                        variant="primary"
                        isLoading={pendingId === r.id}
                        onClick={() => onApproveClaim(r)}
                      >
                        Approve Claim
                      </Button>
                    )}
                    {isClaimPending && onRejectClaim && (
                      <Button
                        size="sm"
                        variant="danger"
                        isLoading={pendingId === r.id}
                        onClick={() => onRejectClaim(r)}
                      >
                        Reject Claim
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      isLoading={pendingId === r.id}
                      onClick={() => onToggleVerified(r)}
                    >
                      {r.is_verified ? 'Unverify' : 'Verify'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      isLoading={pendingId === r.id}
                      onClick={() => onToggleActive(r)}
                    >
                      {r.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </td>
              </Reveal>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

