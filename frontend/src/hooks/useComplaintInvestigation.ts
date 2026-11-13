import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { complaintsApi } from '@/api/complaints'
import { queryKeys } from '@/lib/queryKeys'
import type { ComplaintInvestigationFormPayload } from '@/types/complaint'

export function useComplaintInvestigation(id: number) {
  return useQuery({
    queryKey: queryKeys.complaintInvestigations.detail(id),
    queryFn: () => complaintsApi.investigation.get(id),
    enabled: Number.isFinite(id),
    retry: false,
  })
}

export function useComplaintInvestigationHistory(id: number) {
  return useQuery({
    queryKey: queryKeys.complaintInvestigations.history(id),
    queryFn: () => complaintsApi.investigation.history(id),
    enabled: Number.isFinite(id),
    retry: false,
  })
}

export function useStartComplaintInvestigation(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => complaintsApi.investigation.start(id),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.complaintInvestigations.detail(id), data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.complaintInvestigations.history(id) })
    },
  })
}

export function useUpdateComplaintInvestigation(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<ComplaintInvestigationFormPayload>) =>
      complaintsApi.investigation.update(id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.complaintInvestigations.detail(id), data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.complaintInvestigations.history(id) })
    },
  })
}

export function useCompleteComplaintInvestigation(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Partial<ComplaintInvestigationFormPayload>) =>
      complaintsApi.investigation.complete(id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.complaintInvestigations.detail(id), data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.complaintInvestigations.history(id) })
    },
  })
}
