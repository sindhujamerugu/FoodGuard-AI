/**
 * PROTOTYPE DISCLAIMER: Not an officially integrated government system.
 * All designations are sample prototype accounts.
 */

export interface OfficerAssignment {
  id: number
  complaint: number
  officer_designation: string
  officer_jurisdiction: string
  level_name: string
  level_code: string
  status:
    | 'ASSIGNED'
    | 'UNDER_INVESTIGATION'
    | 'ACTION_TAKEN'
    | 'ESCALATED'
    | 'RESOLVED'
    | 'ON_HOLD'
  /** Customer-visible summary of action taken. Never investigation_notes. */
  action_taken: string
  assigned_at: string
  deadline_at: string
  effective_deadline: string
  is_overdue: boolean
}

export interface EscalationEvent {
  id: number
  from_level_name: string | null
  to_level_name: string
  from_officer_designation: string | null
  to_officer_designation: string | null
  trigger: 'AUTOMATIC' | 'ADMINISTRATIVE'
  customer_message: string
  created_at: string
}
