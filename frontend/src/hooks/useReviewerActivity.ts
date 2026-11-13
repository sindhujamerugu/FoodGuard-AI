import { useQuery } from '@tanstack/react-query'
import { reviewerActivityApi } from '@/api/reviewerActivity'
import { queryKeys } from '@/lib/queryKeys'

export function useReviewerActivity(params?: { page?: number; page_size?: number; action_type?: string; search?: string }) {
  return useQuery({
    queryKey: [...queryKeys.reviewerActivity.all, params ?? {}],
    queryFn: () => reviewerActivityApi.list(params),
  })
}
