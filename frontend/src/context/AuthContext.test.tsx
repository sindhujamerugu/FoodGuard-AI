import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import { authApi } from '@/api/auth'
import { tokenStorage } from '@/lib/tokenStorage'
import { queryClient } from '@/lib/queryClient'
import type { LoginResponse, User } from '@/types/user'

vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    profile: vi.fn(),
  },
}))

describe('AuthContext — Session Cleansing and Credential Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    queryClient.clear()
  })

  function wrapper({ children }: { children: ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>
  }

  it('stores only access and refresh tokens upon login, never passwords', async () => {
    const mockLoginRes: LoginResponse = {
      access: 'fake-access-token',
      refresh: 'fake-refresh-token',
      id: 1,
      email: 'customer@foodguard.ai',
      first_name: 'Dev',
      last_name: 'Customer',
      role: 'CUSTOMER',
      preferred_language: 'en',
    }

    const mockProfile: User = {
      id: 1,
      email: 'customer@foodguard.ai',
      first_name: 'Dev',
      last_name: 'Customer',
      phone: '',
      role: 'CUSTOMER',
      preferred_language: 'en',
      is_active: true,
      date_joined: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }

    vi.mocked(authApi.login).mockResolvedValue(mockLoginRes)
    vi.mocked(authApi.profile).mockResolvedValue(mockProfile)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.login({
        email: 'customer@foodguard.ai',
        password: 'SuperSecretPassword123!',
      })
    })

    // Verify tokenStorage has access and refresh
    expect(tokenStorage.getAccess()).toBe('fake-access-token')
    expect(tokenStorage.getRefresh()).toBe('fake-refresh-token')

    // Verify localStorage & sessionStorage do NOT contain passwords or form credentials
    expect(localStorage.getItem('foodguard.access')).toBe('fake-access-token')
    expect(localStorage.getItem('foodguard.refresh')).toBe('fake-refresh-token')
    expect(localStorage.getItem('password')).toBeNull()
    expect(localStorage.getItem('email')).toBeNull()
    expect(sessionStorage.getItem('password')).toBeNull()
    expect(sessionStorage.getItem('email')).toBeNull()
  })

  it('completely purges tokens, query cache, and user state on logout', async () => {
    tokenStorage.setTokens('initial-access', 'initial-refresh')
    vi.mocked(authApi.logout).mockResolvedValue({} as any)
    vi.spyOn(queryClient, 'clear')

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.logout()
    })

    // Verify tokens were removed
    expect(tokenStorage.getAccess()).toBeNull()
    expect(tokenStorage.getRefresh()).toBeNull()
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)

    // Verify queryClient was cleared
    expect(queryClient.clear).toHaveBeenCalled()

    // Verify localStorage is clean
    expect(localStorage.getItem('foodguard.access')).toBeNull()
    expect(localStorage.getItem('foodguard.refresh')).toBeNull()
  })
})
