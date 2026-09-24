import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
})
export type LoginFormValues = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  first_name: z.string().min(1, 'First name is required.'),
  last_name: z.string().min(1, 'Last name is required.'),
  email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  phone: z.string().optional(),
  preferred_language: z.enum(['en', 'te', 'hi', 'ta', 'kn', 'mr']),
})
export type RegisterFormValues = z.infer<typeof registerSchema>

export const reportSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(255),
  description: z.string().min(1, 'Description is required.'),
  restaurant: z.string().min(1, 'Select a restaurant.'),
})
export type ReportFormValues = z.infer<typeof reportSchema>

export const complaintSchema = z.object({
  food_report: z.string().min(1, 'Select a report.'),
  title: z.string().min(1, 'Title is required.').max(255),
  description: z.string().min(1, 'Description is required.'),
  category: z.enum(['FOOD_QUALITY', 'SPOILAGE', 'FOREIGN_OBJECT', 'HYGIENE', 'TASTE_OR_ODOR', 'OTHER']),
})
export type ComplaintFormValues = z.infer<typeof complaintSchema>

const pincodeRegex = /^[A-Za-z0-9]{4,10}$/
const phoneRegex = /^\+?[\d\s-]{7,20}$/

export const restaurantSchema = z.object({
  name: z.string().min(1, 'Restaurant name is required.').max(255),
  description: z.string().optional(),
  address: z.string().min(1, 'Address is required.'),
  city: z.string().min(1, 'City is required.'),
  state: z.string().min(1, 'State is required.'),
  pincode: z.string().regex(pincodeRegex, 'Pincode must be 4–10 alphanumeric characters.'),
  contact_email: z.string().email('Enter a valid email address.').optional().or(z.literal('')),
  contact_phone: z
    .string()
    .regex(phoneRegex, 'Enter a valid phone number (7–20 digits).')
    .optional()
    .or(z.literal('')),
})
export type RestaurantFormValues = z.infer<typeof restaurantSchema>
