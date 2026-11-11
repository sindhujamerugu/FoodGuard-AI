export type NotificationEventType =
  | 'REPORT_SUBMITTED'
  | 'REPORT_STATUS_CHANGED'
  | 'AI_ANALYSIS_COMPLETED'
  | 'COMPLAINT_SUBMITTED'
  | 'COMPLAINT_STATUS_CHANGED'
  | 'ESCALATION_CREATED'
  | 'ESCALATION_UPDATED'

export interface Notification {
  id: number
  event_type: NotificationEventType
  /** Original English message stored at creation time — never overwritten. */
  message: string
  /** Best-effort localised rendering from the static string catalogue.
   *  Falls back to `message` for event types the catalogue doesn't cover. */
  localized_message: string
  /** Language code of localized_message (e.g. "en", "te"). */
  message_language: string
  related_report: number | null
  related_complaint: number | null
  is_read: boolean
  created_at: string
}
