import { http } from '@/lib/http'
import type {
  Complaint,
  ComplaintCreatePayload,
  ComplaintInvestigation,
  ComplaintInvestigationFormPayload,
  ComplaintInvestigationHistoryEntry,
  ComplaintUpdatePayload,
} from '@/types/complaint'

export const complaintsApi = {
  list: () => http.get<Complaint[]>('/complaints/').then((r) => r.data),

  get: (id: number) => http.get<Complaint>(`/complaints/${id}/`).then((r) => r.data),

  create: (payload: ComplaintCreatePayload) =>
    http.post<Complaint>('/complaints/', payload).then((r) => r.data),

  update: (id: number, payload: ComplaintUpdatePayload) =>
    http.patch<Complaint>(`/complaints/${id}/`, payload).then((r) => r.data),

  investigation: {
    get: (id: number) =>
      http.get<ComplaintInvestigation | { status: string; detail: string }>(`/complaints/${id}/investigation/`).then((r) => r.data),

    start: (id: number) =>
      http.post<ComplaintInvestigation>(`/complaints/${id}/investigation/start/`).then((r) => r.data),

    update: (id: number, payload: Partial<ComplaintInvestigationFormPayload>) =>
      http.patch<ComplaintInvestigation>(`/complaints/${id}/investigation/`, payload).then((r) => r.data),

    complete: (id: number, payload: Partial<ComplaintInvestigationFormPayload>) =>
      http.post<ComplaintInvestigation>(`/complaints/${id}/investigation/complete/`, payload).then((r) => r.data),

    history: (id: number) =>
      http
        .get<{ results: ComplaintInvestigationHistoryEntry[] }>(`/complaints/${id}/investigation/history/`)
        .then((r) => r.data.results),
  },
}
