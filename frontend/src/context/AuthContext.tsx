import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '@/api/auth'
import { authBridge } from '@/lib/authBridge'
import { tokenStorage } from '@/lib/tokenStorage'
import type { LoginPayload, RegisterPayload, RegisterResponse, User } from '@/types/user'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<User>
  register: (payload: RegisterPayload) => Promise<RegisterResponse>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    authBridge.onAuthFailure(() => {
      setUser(null)
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      if (!tokenStorage.getAccess()) {
        setIsLoading(false)
        return
      }
      try {
        const profile = await authApi.profile()
        if (!cancelled) setUser(profile)
      } catch {
        tokenStorage.clear()
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await authApi.login(payload)
    tokenStorage.setTokens(response.access, response.refresh)
    const profile = await authApi.profile()
    setUser(profile)
    return profile
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    return authApi.register(payload)
  }, [])

  const logout = useCallback(async () => {
    const refresh = tokenStorage.getRefresh()
    if (refresh) {
      try {
        await authApi.logout(refresh)
      } catch {
        // Best-effort — proceed to clear local state regardless.
      }
    }
    tokenStorage.clear()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, isAuthenticated: !!user, login, register, logout }),
    [user, isLoading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider.')
  return ctx
}
