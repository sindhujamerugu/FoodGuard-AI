import { http } from '@/lib/http'
import type { Restaurant, RestaurantCreatePayload, RestaurantUpdatePayload } from '@/types/restaurant'

export const restaurantsApi = {
  list: (search?: string) =>
    http.get<Restaurant[]>('/restaurants/', { params: search ? { search } : undefined }).then((r) => r.data),

  get: (id: number) => http.get<Restaurant>(`/restaurants/${id}/`).then((r) => r.data),

  create: (payload: RestaurantCreatePayload) =>
    http.post<Restaurant>('/restaurants/', payload).then((r) => r.data),

  update: (id: number, payload: RestaurantUpdatePayload) =>
    http.patch<Restaurant>(`/restaurants/${id}/`, payload).then((r) => r.data),

  claim: (id: number) =>
    http.post<Restaurant>(`/restaurants/${id}/claim/`).then((r) => r.data),

  approveClaim: (id: number) =>
    http.post<Restaurant>(`/restaurants/${id}/approve-claim/`).then((r) => r.data),

  rejectClaim: (id: number, reason?: string) =>
    http.post<Restaurant>(`/restaurants/${id}/reject-claim/`, { reason }).then((r) => r.data),

  remove: (id: number) => http.delete(`/restaurants/${id}/`).then((r) => r.data),
}
