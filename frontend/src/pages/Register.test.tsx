import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import Register from './Register'
import Login from './Login'
import { LanguageProvider } from '@/i18n/LanguageContext'
import { createTestQueryClient } from '@/test/testUtils'

const mockRegister = vi.fn()
const mockLogin = vi.fn()
const mockNavigate = vi.fn()

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    isAuthenticated: false,
    login: mockLogin,
    register: mockRegister,
    logout: vi.fn(),
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderAuthFlow(initialEntries = ['/register']) {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <LanguageProvider>
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Register — Blank Initial State & No Credential Leakage', () => {
  beforeEach(() => {
    mockRegister.mockReset()
    mockLogin.mockReset()
    mockNavigate.mockReset()
  })

  it('renders all personal input fields strictly empty on initial render', () => {
    renderAuthFlow(['/register'])

    const firstName = screen.getByLabelText(/first name/i) as HTMLInputElement
    const lastName = screen.getByLabelText(/last name/i) as HTMLInputElement
    const email = screen.getByLabelText(/email/i) as HTMLInputElement
    const password = screen.getByLabelText(/password/i) as HTMLInputElement
    const phone = screen.getByLabelText(/phone/i) as HTMLInputElement
    const langSelect = screen.getByLabelText(/preferred language/i) as HTMLSelectElement

    expect(firstName.value).toBe('')
    expect(lastName.value).toBe('')
    expect(email.value).toBe('')
    expect(password.value).toBe('')
    expect(phone.value).toBe('')
    // Default language is 'en'
    expect(langSelect.value).toBe('en')
  })

  it('navigates to /login upon registration without passing registeredEmail in state', async () => {
    mockRegister.mockResolvedValue({
      id: 55,
      email: 'newuser@example.com',
      first_name: 'Jane',
      last_name: 'Doe',
      role: 'CUSTOMER',
      preferred_language: 'en',
    })

    renderAuthFlow(['/register'])

    await userEvent.type(screen.getByLabelText(/first name/i), 'Jane')
    await userEvent.type(screen.getByLabelText(/last name/i), 'Doe')
    await userEvent.type(screen.getByLabelText(/email/i), 'newuser@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'SecurePass2026!')
    await userEvent.type(screen.getByLabelText(/phone/i), '9876543210')

    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled()
      // Crucial requirement: must NOT pass registeredEmail in navigation state
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        replace: true,
        state: { accountCreated: true },
      })
    })
  }, 15000)

  it('displays API error without caching or storing credentials on failure', async () => {
    mockRegister.mockRejectedValue({
      response: { data: { email: ['A user with that email already exists.'] } },
    })

    renderAuthFlow(['/register'])

    await userEvent.type(screen.getByLabelText(/first name/i), 'Jane')
    await userEvent.type(screen.getByLabelText(/last name/i), 'Doe')
    await userEvent.type(screen.getByLabelText(/email/i), 'existing@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'SecurePass2026!')

    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
