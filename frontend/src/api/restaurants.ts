import { http } from '@/lib/http'
import type { Restaurant, RestaurantCreatePayload, RestaurantUpdatePayload } from '@/types/restaurant'

export const restaurantsApi = {
  list: () => http.get<Restaurant[]>('/restaurants/').then((r) => r.data),

  get: (id: number) => http.get<Restaurant>(`/restaurants/${id}/`).then((r) => r.data),

  create: (payload: RestaurantCreatePayload) =>
    http.post<Restaurant>('/restaurants/', payload).then((r) => r.data),

  update: (id: number, payload: RestaurantUpdatePayload) =>
    http.patch<Restaurant>(`/restaurants/${id}/`, payload).then((r) => r.data),

  remove: (id: number) => http.delete(`/restaurants/${id}/`).then((r) => r.data),
}
