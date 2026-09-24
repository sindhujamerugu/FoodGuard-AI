import type { RestaurantMinimal } from './restaurant'
import type { LanguageCode, UserMinimal } from './user'

export type ComplaintCategory =
  | 'FOOD_QUALITY'
  | 'SPOILAGE'
  | 'FOREIGN_OBJECT'
  | 'HYGIENE'
  | 'TASTE_OR_ODOR'
  | 'OTHER'

export const COMPLAINT_CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  FOOD_QUALITY: 'Food Quality',
  SPOILAGE: 'Spoilage',
  FOREIGN_OBJECT: 'Foreign Object',
  HYGIENE: 'Hygiene',
  TASTE_OR_ODOR: 'Taste or Odor',
  OTHER: 'Other',
}

export type ComplaintStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED'

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
}

/** Allowed forward-only workflow transitions, mirroring complaints/services.py */
export const COMPLAINT_STATUS_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['SUBMITTED', 'RESOLVED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
}
