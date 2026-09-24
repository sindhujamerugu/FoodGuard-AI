import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { defaultRouteForRole } from '@/lib/roles'
import type { UserRole } from '@/types/user'

export function RoleGuard({ allow, children }: { allow: UserRole[]; children: ReactNode }) {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  if (!allow.includes(user.role)) {
    return <Navigate to={defaultRouteForRole(user.role)} replace />
  }

  return <>{children}</>
}
