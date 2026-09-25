import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'
import { queryKeys } from '@/lib/queryKeys'
import type { FoodReportCreatePayload, FoodReportUpdatePayload } from '@/types/report'

export function useReports() {
  return useQuery({
    queryKey: queryKeys.reports.all,
    queryFn: reportsApi.list,
  })
}

export function useReport(id: number) {
  return useQuery({
    queryKey: queryKeys.reports.detail(id),
    queryFn: () => reportsApi.get(id),
    enabled: Number.isFinite(id),
  })
}

export function useCreateReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: FoodReportCreatePayload) => reportsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all })
    },
  })
}

export function useUpdateReport(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: FoodReportUpdatePayload) => reportsApi.update(id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.reports.detail(id), updated)
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all })
    },
  })
}

export function useDeleteReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => reportsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all })
    },
  })
}

export function useSubmitReport(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => reportsApi.submit(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.reports.detail(id), updated)
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports.all })
    },
  })
}
