import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { aiApi } from '@/api/ai'
import { queryKeys } from '@/lib/queryKeys'

export function useAIAnalysis(reportId: number) {
  return useQuery({
    queryKey: queryKeys.aiAnalysis.detail(reportId),
    queryFn: () => aiApi.get(reportId),
    enabled: Number.isFinite(reportId),
    retry: (failureCount, error) => {
      // A 404 means "no analysis yet" — not a transient failure, don't retry.
      if (axios.isAxiosError(error) && error.response?.status === 404) return false
      return failureCount < 1
    },
  })
}

export function useRunAIAnalysis(reportId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => aiApi.run(reportId),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.aiAnalysis.detail(reportId), result)
    },
  })
}
