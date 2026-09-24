import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import type { Restaurant } from '@/types/restaurant'

interface RestaurantTableProps {
  restaurants: Restaurant[]
  onToggleVerified: (restaurant: Restaurant) => void
  onToggleActive: (restaurant: Restaurant) => void
  pendingId?: number | null
}

export function RestaurantTable({ restaurants, onToggleVerified, onToggleActive, pendingId }: RestaurantTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-100 bg-white shadow-card">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-100 text-xs uppercase tracking-wide text-neutral-400">
            <th className="px-5 py-3 font-medium">Restaurant</th>
            <th className="px-5 py-3 font-medium">Owner</th>
            <th className="px-5 py-3 font-medium">Location</th>
            <th className="px-5 py-3 font-medium">Verification</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {restaurants.map((r) => (
            <tr key={r.id} className="border-b border-neutral-50 last:border-0">
              <td className="max-w-48 truncate px-5 py-3 font-medium text-neutral-900">{r.name}</td>
              <td className="px-5 py-3 text-neutral-600">
                {r.owner.first_name} {r.owner.last_name}
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
                  {r.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-5 py-3">
                <div className="flex justify-end gap-2">
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
