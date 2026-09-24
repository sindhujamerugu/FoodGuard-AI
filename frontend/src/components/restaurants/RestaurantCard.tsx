import { Link } from 'react-router-dom'
import { BadgeCheck, MapPin, Pencil } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Restaurant } from '@/types/restaurant'

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-100 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">{restaurant.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
            <MapPin className="size-3.5" aria-hidden="true" />
            {restaurant.city}, {restaurant.state}
          </p>
        </div>
        <Link
          to={`/restaurant/${restaurant.id}/edit`}
          className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
          aria-label={`Edit ${restaurant.name}`}
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {restaurant.description && <p className="line-clamp-2 text-sm text-neutral-600">{restaurant.description}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
            restaurant.is_verified ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700',
          )}
        >
          <BadgeCheck className="size-3.5" aria-hidden="true" />
          {restaurant.is_verified ? 'Verified' : 'Pending Verification'}
        </span>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
            restaurant.is_active ? 'bg-primary-100 text-primary-800' : 'bg-neutral-200 text-neutral-500',
          )}
        >
          {restaurant.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  )
}
