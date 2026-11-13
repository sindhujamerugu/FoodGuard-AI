export type ReviewerActivityActionType =
  | 'COMPLAINT_STATUS_CHANGED'
  | 'COMPLAINT_REJECTED'
  | 'COMPLAINT_PRIORITY_CHANGED'
  | 'COMPLAINT_RESOLVED'
  | 'ESCALATION_CREATED'
  | 'ESCALATION_UPDATED'

export interface ReviewerActor {
  id: number
  email: string
  first_name: string
  last_name: string
  role: string
}

export interface ReviewerActivityEntry {
  id: number
  actor: ReviewerActor | null
  complaint: number | null
  escalation: number | null
  action_type: ReviewerActivityActionType
  summary: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface ReviewerActivityPage {
  count: number
  page: number
  page_size: number
  results: ReviewerActivityEntry[]
}
