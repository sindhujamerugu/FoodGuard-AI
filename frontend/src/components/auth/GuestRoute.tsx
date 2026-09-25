import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { defaultRouteForRole } from '@/lib/roles'

/** Redirects an already-authenticated user away from public-only pages like /login and /register. */
export function GuestRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) return null
  if (user) return <Navigate to={defaultRouteForRole(user.role)} replace />

  return <>{children}</>
}
