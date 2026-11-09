import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { escalationsApi } from '@/api/escalations'
import { queryKeys } from '@/lib/queryKeys'
import type { EscalationCreatePayload, EscalationUpdatePayload } from '@/types/escalation'

export function useEscalations() {
  return useQuery({
    queryKey: queryKeys.escalations.all,
    queryFn: escalationsApi.list,
  })
}

export function useEscalation(id: number) {
  return useQuery({
    queryKey: queryKeys.escalations.detail(id),
    queryFn: () => escalationsApi.get(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

export function useCreateEscalation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: EscalationCreatePayload) => escalationsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.escalations.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.complaints.all })
    },
  })
}

export function useUpdateEscalation(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: EscalationUpdatePayload) => escalationsApi.update(id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.escalations.detail(id), updated)
      void queryClient.invalidateQueries({ queryKey: queryKeys.escalations.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.complaints.all })
    },
  })
}
