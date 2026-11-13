import type { TranslationKey } from '@/i18n/en'
import type { RestaurantMinimal } from './restaurant'
import type { LanguageCode, UserMinimal } from './user'

export type ComplaintCategory =
  | 'FOOD_QUALITY'
  | 'SPOILAGE'
  | 'FOREIGN_OBJECT'
  | 'HYGIENE'
  | 'TASTE_OR_ODOR'
  | 'OTHER'

export const COMPLAINT_CATEGORY_KEYS: Record<ComplaintCategory, TranslationKey> = {
  FOOD_QUALITY: 'category.foodQuality',
  SPOILAGE: 'category.spoilage',
  FOREIGN_OBJECT: 'category.foreignObject',
  HYGIENE: 'category.hygiene',
  TASTE_OR_ODOR: 'category.tasteOrOdor',
  OTHER: 'category.other',
}

export const COMPLAINT_CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  FOOD_QUALITY: 'Food Quality',
  SPOILAGE: 'Spoilage',
  FOREIGN_OBJECT: 'Foreign Object',
  HYGIENE: 'Hygiene',
  TASTE_OR_ODOR: 'Taste or Odor',
  OTHER: 'Other',
}

export type ComplaintStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED' | 'REJECTED'

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface ComplaintFoodReportMinimal {
  id: number
  title: string
  status: string
}

export interface Complaint {
  id: number
  food_report: ComplaintFoodReportMinimal
  customer: UserMinimal
  restaurant: RestaurantMinimal
  title: string
  description: string
  category: ComplaintCategory
  original_language: LanguageCode
  status: ComplaintStatus
  priority: ComplaintPriority
  resolution_notes: string
  rejection_reason?: string
  rejected_by?: UserMinimal | null
  rejected_at?: string | null
  submitted_at: string
  updated_at: string
  resolved_at: string | null
}

export interface ComplaintCreatePayload {
  food_report: number
  title: string
  description: string
  category: ComplaintCategory
}

export interface ComplaintUpdatePayload {
  status?: ComplaintStatus
  priority?: ComplaintPriority
  resolution_notes?: string
  rejection_reason?: string
}

export type InvestigationStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'AWAITING_INFORMATION' | 'COMPLETED'
export type InvestigationRecommendation =
  | 'RESOLVE_COMPLAINT'
  | 'REJECT_COMPLAINT'
  | 'ESCALATE_COMPLAINT'
  | 'REQUEST_MORE_INFORMATION'

export interface ComplaintInvestigationActor {
  id: number
  email: string
  first_name: string
  last_name: string
  role?: string
}

export interface ComplaintInvestigation {
  id: number
  complaint: number
  investigator: ComplaintInvestigationActor | null
  assigned_reviewer: ComplaintInvestigationActor | null
  status: InvestigationStatus
  summary: string
  findings: string
  observations: string
  evidence_review_notes: string
  actions_taken: string
  recommendation: InvestigationRecommendation | ''
  remarks: string
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface ComplaintInvestigationHistoryEntry {
  id: number
  actor: ComplaintInvestigationActor | null
  complaint: number | null
  escalation: number | null
  action_type: string
  summary: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface ComplaintInvestigationFormPayload {
  summary: string
  findings: string
  observations: string
  evidence_review_notes: string
  actions_taken: string
  recommendation: InvestigationRecommendation | ''
  remarks: string
  status: InvestigationStatus
}

/** Allowed forward-only workflow transitions, mirroring complaints/services.py */
export const COMPLAINT_STATUS_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['SUBMITTED', 'RESOLVED', 'REJECTED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
  REJECTED: [],
}
