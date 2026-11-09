import { Link } from 'react-router-dom'
import { BadgeCheck, MapPin, Pencil, Store } from 'lucide-react'
import { cn } from '@/lib/cn'
import { gradientCover } from '@/lib/gradientCover'
import { useTranslation } from '@/i18n/LanguageContext'
import type { Restaurant } from '@/types/restaurant'

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const t = useTranslation()
  const isPendingClaim = restaurant.claim_status === 'PENDING' && !restaurant.owner

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-card transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className={cn('relative flex h-20 items-center justify-center bg-gradient-to-br', gradientCover(restaurant.name))}>
        <Store
          className="size-8 text-white/30 transition-transform duration-300 group-hover:scale-110"
          aria-hidden="true"
        />
        <span
          className={cn(
            'absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur',
            isPendingClaim
              ? 'bg-amber-500/80 text-white'
              : restaurant.is_active
              ? 'bg-white/20 text-white'
              : 'bg-neutral-900/30 text-white/80',
          )}
        >
          {isPendingClaim ? t('claimStatus.pending') : restaurant.is_active ? t('common.active') : t('common.inactive')}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">{restaurant.name}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
              <MapPin className="size-3.5" aria-hidden="true" />
              {restaurant.city}, {restaurant.state}
            </p>
          </div>
          {!isPendingClaim && (
            <Link
              to={`/restaurant/${restaurant.id}/edit`}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-50"
              aria-label={`${t('common.edit')} ${restaurant.name}`}
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Link>
          )}
        </div>

        {restaurant.description && <p className="line-clamp-2 text-sm text-neutral-600">{restaurant.description}</p>}

        <div className="flex flex-wrap items-center gap-2">
          {isPendingClaim ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              {t('claimStatus.awaitingApproval')}
            </span>
          ) : (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                restaurant.is_verified ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700',
              )}
            >
              <BadgeCheck className="size-3.5" aria-hidden="true" />
              {restaurant.is_verified ? 'Verified' : 'Pending Verification'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

