import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import Login from './Login'
import Register from './Register'
import { LanguageProvider } from '@/i18n/LanguageContext'
import { createTestQueryClient } from '@/test/testUtils'

const mockLogin = vi.fn()
const mockNavigate = vi.fn()
const mockRegister = vi.fn()

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

function renderLogin(initialEntries = ['/login']) {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <LanguageProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Login — Clean Credential Initialization', () => {
  beforeEach(() => {
    mockLogin.mockReset()
    mockNavigate.mockReset()
    mockRegister.mockReset()
  })

  it('renders email and password fields strictly empty and initially readOnly on initial load', () => {
    renderLogin()
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement

    expect(emailInput).toBeInTheDocument()
    expect(emailInput.value).toBe('')
    expect(emailInput.readOnly).toBe(true)

    expect(passwordInput).toBeInTheDocument()
    expect(passwordInput.value).toBe('')
    expect(passwordInput.readOnly).toBe(true)

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('removes readOnly and allows normal typing when user focuses or clicks fields', async () => {
    renderLogin()
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement

    // Initially readOnly to mitigate Chrome autofill
    expect(emailInput.readOnly).toBe(true)
    expect(passwordInput.readOnly).toBe(true)

    // User focuses/clicks email field
    await userEvent.click(emailInput)
    expect(emailInput.readOnly).toBe(false)
    await userEvent.type(emailInput, 'user@example.com')
    expect(emailInput.value).toBe('user@example.com')

    // User focuses/clicks password field
    await userEvent.click(passwordInput)
    expect(passwordInput.readOnly).toBe(false)
    await userEvent.type(passwordInput, 'MySecurePassword123')
    expect(passwordInput.value).toBe('MySecurePassword123')
  })

  it('submits exactly what the user typed without interference', async () => {
    mockLogin.mockResolvedValue({ role: 'CUSTOMER' })
    renderLogin()

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement

    await userEvent.type(emailInput, 'exact.user@foodguard.org')
    await userEvent.type(passwordInput, 'ExactPass987!')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'exact.user@foodguard.org',
        password: 'ExactPass987!',
      })
    })
  })

  it('does NOT prefill email even if location state contains registeredEmail', () => {
    // Simulate someone navigating with location state
    renderLogin([{ pathname: '/login', state: { registeredEmail: 'someone@example.com', accountCreated: true } } as any])

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement

    // Crucial check: email must remain completely empty!
    expect(emailInput.value).toBe('')
    expect(passwordInput.value).toBe('')
    // The success message may be displayed
    expect(screen.getByText(/account created/i)).toBeInTheDocument()
  })

  it('redirects a CUSTOMER to /dashboard after a successful login', async () => {
    mockLogin.mockResolvedValue({ role: 'CUSTOMER' })
    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'customer@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'StrongPass99')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true }))
  })

  it('redirects an ADMIN to /admin after a successful login', async () => {
    mockLogin.mockResolvedValue({ role: 'ADMIN' })
    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'StrongPass99')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true }))
  })

  it('redirects a REVIEWER to /reviewer (not /admin) after a successful login', async () => {
    mockLogin.mockResolvedValue({ role: 'REVIEWER' })
    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'reviewer@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'StrongPass99')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/reviewer', { replace: true }))
  })

  it('shows the API error message and does not navigate on failed login', async () => {
    mockLogin.mockRejectedValue({ response: { data: { detail: 'Invalid credentials.' } } })
    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'wrong@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('does not call login when the form is submitted empty (client-side validation)', async () => {
    renderLogin()
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(mockLogin).not.toHaveBeenCalled())
  })

  it('maintains strictly empty fields when navigating from Login -> Register -> Login', async () => {
    // 1. Initial Login page load
    const { unmount } = renderLogin(['/login'])
    const initialEmail = screen.getByLabelText(/email/i) as HTMLInputElement
    const initialPassword = screen.getByLabelText(/password/i) as HTMLInputElement
    expect(initialEmail.value).toBe('')
    expect(initialPassword.value).toBe('')

    // Type something in login
    await userEvent.type(initialEmail, 'someuser@example.com')
    await userEvent.type(initialPassword, 'mypassword123')
    expect(initialEmail.value).toBe('someuser@example.com')
    expect(initialPassword.value).toBe('mypassword123')
    unmount()

    // 2. Navigate to Register page
    const regRender = renderLogin(['/register'])
    const regEmail = screen.getByLabelText(/email/i) as HTMLInputElement
    const regPassword = screen.getByLabelText(/password/i) as HTMLInputElement
    expect(regEmail.value).toBe('')
    expect(regPassword.value).toBe('')
    regRender.unmount()

    // 3. Navigate back to Login page
    renderLogin(['/login'])
    const reloadedEmail = screen.getByLabelText(/email/i) as HTMLInputElement
    const reloadedPassword = screen.getByLabelText(/password/i) as HTMLInputElement
    expect(reloadedEmail.value).toBe('')
    expect(reloadedPassword.value).toBe('')
    expect(reloadedEmail.readOnly).toBe(true)
    expect(reloadedPassword.readOnly).toBe(true)
  })

  it('does not prefill fields even if query/search params are provided in URL', () => {
    renderLogin(['/login?email=paramuser@example.com&password=secretpassword'])
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement

    expect(emailInput.value).toBe('')
    expect(passwordInput.value).toBe('')
  })
})
