import type { LucideIcon } from 'lucide-react'
import { Building2, FileText, LayoutDashboard, MessageSquare, ShieldCheck, User } from 'lucide-react'
import type { UserRole } from '@/types/user'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

const CUSTOMER_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Reports', to: '/reports', icon: FileText },
  { label: 'Complaints', to: '/complaints', icon: MessageSquare },
  { label: 'Profile', to: '/profile', icon: User },
]

const RESTAURANT_NAV: NavItem[] = [
  { label: 'My Restaurants', to: '/restaurant', icon: Building2, end: true },
  { label: 'Profile', to: '/profile', icon: User },
]

const REVIEWER_NAV: NavItem[] = [
  { label: 'Dashboard', to: '/reviewer', icon: LayoutDashboard, end: true },
  { label: 'Reports', to: '/reviewer/reports', icon: FileText },
  { label: 'Complaints', to: '/reviewer/complaints', icon: MessageSquare },
  { label: 'Restaurants', to: '/reviewer/restaurants', icon: Building2 },
  { label: 'Profile', to: '/profile', icon: User },
]

export function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case 'CUSTOMER':
      return CUSTOMER_NAV
    case 'RESTAURANT_USER':
      return RESTAURANT_NAV
    case 'REVIEWER':
    case 'ADMIN':
      return REVIEWER_NAV
    default:
      return []
  }
}

export const BRAND = { name: 'FoodGuard AI', icon: ShieldCheck }
