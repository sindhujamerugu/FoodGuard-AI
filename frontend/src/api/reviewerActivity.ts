import { http } from '@/lib/http'
import type { ReviewerActivityPage } from '@/types/reviewerActivity'

export const reviewerActivityApi = {
  list: (params?: { page?: number; page_size?: number; action_type?: string; search?: string }) =>
    http
      .get<ReviewerActivityPage>('/complaints/activity/', { params })
      .then((response) => response.data),
}
