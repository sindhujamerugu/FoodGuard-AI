export type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface FeedbackComplaintMinimal {
  id: number
  title: string
  status: string
  category: string
}

export interface FeedbackCustomerMinimal {
  id: number
  email: string
  first_name: string
  last_name: string
}

export interface Feedback {
  id: number
  complaint: FeedbackComplaintMinimal
  customer: FeedbackCustomerMinimal
  /** 1–5 */
  rating: number
  comments: string
  original_language: string
  moderation_status: ModerationStatus
  created_at: string
  updated_at: string
}

export interface FeedbackCreatePayload {
  complaint: number
  rating: number
  comments?: string
}

export interface RestaurantRating {
  restaurant_id: number
  restaurant_name: string
  average_rating: number | null
  total_ratings: number
  distribution: Record<string, number>
  has_ratings: boolean
}
