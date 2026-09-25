import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { restaurantsApi } from '@/api/restaurants'
import { queryKeys } from '@/lib/queryKeys'
import type { RestaurantCreatePayload, RestaurantUpdatePayload } from '@/types/restaurant'

export function useRestaurants() {
  return useQuery({
    queryKey: queryKeys.restaurants.all,
    queryFn: restaurantsApi.list,
  })
}

export function useRestaurant(id: number) {
  return useQuery({
    queryKey: queryKeys.restaurants.detail(id),
    queryFn: () => restaurantsApi.get(id),
    enabled: Number.isFinite(id),
  })
}

export function useCreateRestaurant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: RestaurantCreatePayload) => restaurantsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.restaurants.all })
    },
  })
}

export function useUpdateRestaurant(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: RestaurantUpdatePayload) => restaurantsApi.update(id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.restaurants.detail(id), updated)
      void queryClient.invalidateQueries({ queryKey: queryKeys.restaurants.all })
    },
  })
}

export function useDeleteRestaurant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => restaurantsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.restaurants.all })
    },
  })
}
