import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { complaintsApi } from '@/api/complaints'
import { queryKeys } from '@/lib/queryKeys'
import type { ComplaintCreatePayload, ComplaintUpdatePayload } from '@/types/complaint'

export function useComplaints() {
  return useQuery({
    queryKey: queryKeys.complaints.all,
    queryFn: complaintsApi.list,
  })
}

export function useComplaint(id: number) {
  return useQuery({
    queryKey: queryKeys.complaints.detail(id),
    queryFn: () => complaintsApi.get(id),
    enabled: Number.isFinite(id),
  })
}

export function useCreateComplaint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ComplaintCreatePayload) => complaintsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.complaints.all })
    },
  })
}

export function useUpdateComplaint(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ComplaintUpdatePayload) => complaintsApi.update(id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.complaints.detail(id), updated)
      void queryClient.invalidateQueries({ queryKey: queryKeys.complaints.all })
    },
  })
}
