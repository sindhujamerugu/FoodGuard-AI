export type UserRole = 'CUSTOMER' | 'RESTAURANT_USER' | 'REVIEWER' | 'ADMIN'

export type LanguageCode = 'en' | 'te' | 'hi' | 'ta' | 'kn' | 'mr'

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: 'English',
  te: 'Telugu',
  hi: 'Hindi',
  ta: 'Tamil',
  kn: 'Kannada',
  mr: 'Marathi',
}

/** Full profile shape returned by GET /api/v1/auth/profile/ */
export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string
  role: UserRole
  preferred_language: LanguageCode
  is_active: boolean
  date_joined: string
  updated_at: string
}

/** Minimal owner/customer representation nested in other resources */
export interface UserMinimal {
  id: number
  email: string
  first_name: string
  last_name: string
  role?: UserRole
  preferred_language?: LanguageCode
}

export interface RegisterPayload {
  email: string
  password: string
  first_name: string
  last_name: string
  phone?: string
  preferred_language?: LanguageCode
}

export interface RegisterResponse {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string
  role: UserRole
  preferred_language: LanguageCode
  date_joined: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  access: string
  refresh: string
  id: number
  email: string
  first_name: string
  last_name: string
  role: UserRole
  preferred_language: LanguageCode
}
