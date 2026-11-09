import { http } from '@/lib/http'
import type { Escalation, EscalationCreatePayload, EscalationUpdatePayload } from '@/types/escalation'

export const escalationsApi = {
  list: () => http.get<Escalation[]>('/escalations/').then((r) => r.data),

  get: (id: number) => http.get<Escalation>(`/escalations/${id}/`).then((r) => r.data),

  create: (payload: EscalationCreatePayload) =>
    http.post<Escalation>('/escalations/', payload).then((r) => r.data),

  update: (id: number, payload: EscalationUpdatePayload) =>
    http.patch<Escalation>(`/escalations/${id}/`, payload).then((r) => r.data),
}
