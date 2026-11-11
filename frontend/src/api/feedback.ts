import { http } from '@/lib/http'
import type { Feedback, FeedbackCreatePayload, RestaurantRating } from '@/types/feedback'

export const feedbackApi = {
  /** GET /api/v1/feedback/ — own feedback (customer) or all (reviewer/admin) */
  list: () => http.get<Feedback[]>('/feedback/').then(r => r.data),

  /** GET /api/v1/feedback/:id/ */
  get: (id: number) => http.get<Feedback>(`/feedback/${id}/`).then(r => r.data),

  /** POST /api/v1/feedback/ */
  create: (payload: FeedbackCreatePayload) =>
    http.post<Feedback>('/feedback/', payload).then(r => r.data),

  /** GET /api/v1/restaurants/:id/rating/ — APPROVED aggregate only */
  restaurantRating: (restaurantId: number) =>
    http.get<RestaurantRating>(`/restaurants/${restaurantId}/rating/`).then(r => r.data),
}
