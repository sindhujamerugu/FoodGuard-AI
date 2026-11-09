import type { UserMinimal } from './user'

export type EscalationLevel = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3'

export const ESCALATION_LEVEL_LABELS: Record<EscalationLevel, string> = {
  LEVEL_1: 'Level 1 — Higher Review',
  LEVEL_2: 'Level 2 — Senior Review',
  LEVEL_3: 'Level 3 — Highest Application Review',
}

export type EscalationStatus = 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED'

export interface EscalationComplaintMinimal {
  id: number
  title: string
  status: string
  category: string
}

export interface Escalation {
  id: number
  complaint: EscalationComplaintMinimal
  created_by: UserMinimal
  assigned_to: UserMinimal | null
  escalation_level: EscalationLevel
  reason: string
  original_language: string
  status: EscalationStatus
  resolution_notes: string
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export interface EscalationCreatePayload {
  complaint: number
  escalation_level?: EscalationLevel
  reason: string
  assigned_to?: number | null
}

export interface EscalationUpdatePayload {
  assigned_to?: number | null
  escalation_level?: EscalationLevel
  status?: EscalationStatus
  resolution_notes?: string
}
