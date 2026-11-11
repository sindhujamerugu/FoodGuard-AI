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
  /**
   * Latitude captured from browser Geolocation API.
   * DRF DecimalField serialises as a string (e.g. "17.385044").
   * null when the customer skipped or denied location.
   */
  location_lat: string | null
  /**
   * Longitude captured from browser Geolocation API.
   * DRF DecimalField serialises as a string (e.g. "78.486671").
   * null when the customer skipped or denied location.
   */
  location_lng: string | null
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
  /** Latitude in decimal degrees, range −90 to 90. Omit or pass null to skip. */
  location_lat?: number | null
  /** Longitude in decimal degrees, range −180 to 180. Omit or pass null to skip. */
  location_lng?: number | null
}

export interface FoodReportUpdatePayload {
  title?: string
  description?: string
  restaurant?: number
  image?: File | null
  location_lat?: number | null
  location_lng?: number | null
}
