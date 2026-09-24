import type { RestaurantMinimal } from './restaurant'
import type { UserMinimal } from './user'

export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED'

export type ReportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface FoodReport {
  id: number
  customer: UserMinimal
  restaurant: RestaurantMinimal
  title: string
  description: string
  /** Absolute URL, or null if no image uploaded */
  image: string | null
  status: ReportStatus
  priority: ReportPriority
  created_at: string
  updated_at: string
}

export interface FoodReportCreatePayload {
  restaurant: number
  title: string
  description: string
  image?: File | null
}

export interface FoodReportUpdatePayload {
  title?: string
  description?: string
  restaurant?: number
  image?: File | null
}
