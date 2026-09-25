import { http } from '@/lib/http'
import type { Complaint, ComplaintCreatePayload, ComplaintUpdatePayload } from '@/types/complaint'

export const complaintsApi = {
  list: () => http.get<Complaint[]>('/complaints/').then((r) => r.data),

  get: (id: number) => http.get<Complaint>(`/complaints/${id}/`).then((r) => r.data),

  create: (payload: ComplaintCreatePayload) =>
    http.post<Complaint>('/complaints/', payload).then((r) => r.data),

  update: (id: number, payload: ComplaintUpdatePayload) =>
    http.patch<Complaint>(`/complaints/${id}/`, payload).then((r) => r.data),
}
