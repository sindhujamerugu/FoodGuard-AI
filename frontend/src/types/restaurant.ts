import type { UserMinimal } from './user'

export interface Restaurant {
  id: number
  name: string
  description: string
  address: string
  city: string
  state: string
  pincode: string
  contact_email: string
  contact_phone: string
  owner: UserMinimal
  is_verified: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RestaurantMinimal {
  id: number
  name: string
  city: string
  state: string
}

export interface RestaurantCreatePayload {
  name: string
  description?: string
  address: string
  city: string
  state: string
  pincode: string
  contact_email?: string
  contact_phone?: string
  is_active?: boolean
}

export type RestaurantUpdatePayload = Partial<RestaurantCreatePayload> & {
  is_verified?: boolean
}
