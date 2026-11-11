import { http } from '@/lib/http'
import type { EscalationEvent, OfficerAssignment } from '@/types/officerAssignment'

export const officerAssignmentsApi = {
  /** GET /api/v1/officer-assignments/<complaint_id>/ — active assignment for one complaint */
  getForComplaint: (complaintId: number) =>
    http.get<OfficerAssignment>(`/officer-assignments/${complaintId}/`).then(r => r.data),

  /** GET /api/v1/escalation-events/<complaint_id>/ — public escalation history */
  getEvents: (complaintId: number) =>
    http.get<EscalationEvent[]>(`/escalation-events/${complaintId}/`).then(r => r.data),
}
