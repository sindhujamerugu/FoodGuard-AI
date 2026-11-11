import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { feedbackApi } from '@/api/feedback'
import { queryKeys } from '@/lib/queryKeys'
import { useAuth } from '@/context/AuthContext'
import type { FeedbackCreatePayload } from '@/types/feedback'

export function useFeedback() {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: queryKeys.feedback.all,
    queryFn:  feedbackApi.list,
    enabled:  isAuthenticated,
    staleTime: 30_000,
  })
}

export function useFeedbackDetail(id: number) {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: queryKeys.feedback.detail(id),
    queryFn:  () => feedbackApi.get(id),
    enabled:  isAuthenticated && Number.isFinite(id) && id > 0,
  })
}

export function useCreateFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: FeedbackCreatePayload) => feedbackApi.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.feedback.all })
    },
  })
}

export function useRestaurantRating(restaurantId: number) {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: queryKeys.feedback.restaurantRating(restaurantId),
    queryFn:  () => feedbackApi.restaurantRating(restaurantId),
    enabled:  isAuthenticated && Number.isFinite(restaurantId) && restaurantId > 0,
    staleTime: 60_000,
  })
}
