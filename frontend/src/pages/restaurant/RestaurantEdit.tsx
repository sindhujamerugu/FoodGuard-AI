import { useParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/LoadingSkeleton'
import { useRestaurant } from '@/hooks/useRestaurants'
import { RestaurantForm } from './RestaurantForm'

export default function RestaurantEditPage() {
  const { id } = useParams<{ id: string }>()
  const { data: restaurant, isLoading, isError, refetch } = useRestaurant(Number(id))

  if (isLoading) {
    return (
      <AppShell title="Edit Restaurant">
        <Skeleton className="mx-auto h-96 w-full max-w-2xl rounded-2xl" />
      </AppShell>
    )
  }

  if (isError || !restaurant) {
    return (
      <AppShell title="Edit Restaurant">
        <ErrorState message="We couldn't load this restaurant." onRetry={() => refetch()} />
      </AppShell>
    )
  }

  return <RestaurantForm mode="edit" existingRestaurant={restaurant} />
}
