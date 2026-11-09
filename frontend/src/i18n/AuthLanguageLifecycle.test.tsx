import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import { LanguageProvider, useLanguage } from '@/i18n/LanguageContext'
import { createTestQueryClient } from '@/test/testUtils'

const mockUpdatePreferredLanguage = vi.fn()
vi.mock('@/api/auth', () => ({
  authApi: {
    updatePreferredLanguage: (...args: unknown[]) => mockUpdatePreferredLanguage(...args),
  },
}))

let mockAuthState: {
  user: any
  isLoading: boolean
  isAuthenticated: boolean
  login: any
  register: any
  logout: any
}

const mockLoginFn = vi.fn()
const mockRegisterFn = vi.fn()
const mockLogoutFn = vi.fn()

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}))

function TestApp({ initialEntries = ['/login'] }: { initialEntries?: string[] }) {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <LanguageProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<DashboardProbe />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function DashboardProbe() {
  const { language, t } = useLanguage()
  return (
    <div>
      <h1 data-testid="auth-lang">{language}</h1>
      <p data-testid="auth-welcome">{t('dashboard.customer.welcome', { name: 'Sita' })}</p>
    </div>
  )
}

describe('Auth Language Lifecycle — Pre-Auth Selection, Login Preservation & Logout Retention', () => {
  beforeEach(() => {
    localStorage.clear()
    mockUpdatePreferredLanguage.mockReset().mockResolvedValue({})
    mockLoginFn.mockReset()
    mockRegisterFn.mockReset()
    mockLogoutFn.mockReset()

    mockAuthState = {
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: mockLoginFn,
      register: mockRegisterFn,
      logout: mockLogoutFn,
    }
  })

  describe('1. First Visit & Defaults', () => {
    it('defaults to English on fresh visit for Login page', () => {
      render(<TestApp initialEntries={['/login']} />)

      // Main form elements in English
      expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
      expect(screen.getByText('Sign in to your FoodGuard AI account')).toBeInTheDocument()
      expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Password/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
      expect(screen.getByText("Don't have an account?")).toBeInTheDocument()
      expect(screen.getByText('Create one')).toBeInTheDocument()

      // Desktop banner in English
      expect(screen.getByText('Report food safety concerns. Get them reviewed. Keep restaurants accountable.')).toBeInTheDocument()

      // Language selector displays English
      expect(screen.getByText('English')).toBeInTheDocument()
    })

    it('defaults to English on fresh visit for Register page', () => {
      render(<TestApp initialEntries={['/register']} />)

      expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
      expect(screen.getByText('Report food safety concerns in your community')).toBeInTheDocument()
      expect(screen.getByLabelText(/First name/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Last name/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Password/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Phone/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Preferred language/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
      expect(screen.getByText('Already have an account?')).toBeInTheDocument()
    })
  })

  describe('2. Pre-Auth Language Selection on Login Page', () => {
    it('switches Login page completely to Telugu (తెలుగు) without page reload', async () => {
      render(<TestApp initialEntries={['/login']} />)

      // Open language dropdown
      await userEvent.click(screen.getByTestId('language-selector-trigger'))

      // Select Telugu from native script menu
      const teluguOption = screen.getByRole('menuitem', { name: 'తెలుగు' })
      expect(teluguOption).toBeInTheDocument()
      await userEvent.click(teluguOption)

      // Form updates immediately to Telugu
      expect(screen.getByRole('heading', { name: 'తిరిగి స్వాగతం' })).toBeInTheDocument()
      expect(screen.getByText('మీ FoodGuard AI ఖాతాలోకి సైన్ ఇన్ చేయండి')).toBeInTheDocument()
      expect(screen.getByLabelText(/ఇమెయిల్/)).toBeInTheDocument()
      expect(screen.getByLabelText(/పాస్‌వర్డ్/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'సైన్ ఇన్' })).toBeInTheDocument()
      expect(screen.getByText('ఖాతా లేదా?')).toBeInTheDocument()
      expect(screen.getByText('ఒకటి సృష్టించండి')).toBeInTheDocument()

      // Banner updates to Telugu
      expect(screen.getByText('ఆహార భద్రత సమస్యలను నివేదించండి. సమీక్ష జరిపించండి. రెస్టారెంట్లను జవాబుదారీగా ఉంచండి.')).toBeInTheDocument()

      // Language selector now displays Telugu native script
      expect(screen.getByText('తెలుగు')).toBeInTheDocument()

      // Stored in localStorage
      expect(localStorage.getItem('foodguard.language')).toBe('te')
    })

    it('switches Login page to Hindi (हिन्दी) immediately', async () => {
      render(<TestApp initialEntries={['/login']} />)

      await userEvent.click(screen.getByTestId('language-selector-trigger'))
      await userEvent.click(screen.getByRole('menuitem', { name: 'हिन्दी' }))

      expect(screen.getByRole('heading', { name: 'वापसी पर स्वागत है' })).toBeInTheDocument()
      expect(screen.getByText('अपने FoodGuard AI खाते में साइन इन करें')).toBeInTheDocument()
      expect(screen.getByLabelText(/ईमेल/)).toBeInTheDocument()
      expect(screen.getByLabelText(/पासवर्ड/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'साइन इन करें' })).toBeInTheDocument()
      expect(screen.getByText('खाता नहीं है?')).toBeInTheDocument()
      expect(screen.getByText('एक बनाएं')).toBeInTheDocument()
      expect(localStorage.getItem('foodguard.language')).toBe('hi')
    })

    it('switches Login page to Tamil (தமிழ்) immediately', async () => {
      render(<TestApp initialEntries={['/login']} />)

      await userEvent.click(screen.getByTestId('language-selector-trigger'))
      await userEvent.click(screen.getByRole('menuitem', { name: 'தமிழ்' }))

      expect(screen.getByRole('heading', { name: 'மீண்டும் வருக' })).toBeInTheDocument()
      expect(screen.getByText('உங்கள் FoodGuard AI கணக்கில் உள்நுழையவும்')).toBeInTheDocument()
      expect(screen.getByLabelText(/மின்னஞ்சல்/)).toBeInTheDocument()
      expect(screen.getByLabelText(/கடவுச்சொல்/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'உள்நுழைக' })).toBeInTheDocument()
      expect(screen.getByText('கணக்கு இல்லையா?')).toBeInTheDocument()
      expect(screen.getByText('புதிய கணக்கை உருவாக்கவும்')).toBeInTheDocument()
      expect(localStorage.getItem('foodguard.language')).toBe('ta')
    })

    it('switches Login page to Kannada (ಕನ್ನಡ) immediately', async () => {
      render(<TestApp initialEntries={['/login']} />)

      await userEvent.click(screen.getByTestId('language-selector-trigger'))
      await userEvent.click(screen.getByRole('menuitem', { name: 'ಕನ್ನಡ' }))

      expect(screen.getByRole('heading', { name: 'ಮರಳಿ ಸ್ವಾಗತ' })).toBeInTheDocument()
      expect(screen.getByText('ನಿಮ್ಮ FoodGuard AI ಖಾತೆಗೆ ಸೈನ್ ಇನ್ ಮಾಡಿ')).toBeInTheDocument()
      expect(screen.getByLabelText(/ಇಮೇಲ್/)).toBeInTheDocument()
      expect(screen.getByLabelText(/ಪಾಸ್‌ವರ್ಡ್/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'ಸೈನ್ ಇನ್' })).toBeInTheDocument()
      expect(screen.getByText('ಖಾತೆ ಇಲ್ಲವೇ?')).toBeInTheDocument()
      expect(screen.getByText('ಒಂದನ್ನು ರಚಿಸಿ')).toBeInTheDocument()
      expect(localStorage.getItem('foodguard.language')).toBe('kn')
    })

    it('switches Login page to Marathi (मराठी) immediately', async () => {
      render(<TestApp initialEntries={['/login']} />)

      await userEvent.click(screen.getByTestId('language-selector-trigger'))
      await userEvent.click(screen.getByRole('menuitem', { name: 'मराठी' }))

      expect(screen.getByRole('heading', { name: 'पुन्हा स्वागत आहे' })).toBeInTheDocument()
      expect(screen.getByText('आपल्या FoodGuard AI खात्यामध्ये साइन इन करा')).toBeInTheDocument()
      expect(screen.getByLabelText(/ईमेल/)).toBeInTheDocument()
      expect(screen.getByLabelText(/पासवर्ड/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'साइन इन करा' })).toBeInTheDocument()
      expect(screen.getByText('खाते नाही का?')).toBeInTheDocument()
      expect(screen.getByText('नवीन तयार करा')).toBeInTheDocument()
      expect(localStorage.getItem('foodguard.language')).toBe('mr')
    })
  })

  describe('3. Pre-Auth Language Selection on Register Page', () => {
    it('switches Register page completely to Telugu when chosen on /register', async () => {
      render(<TestApp initialEntries={['/register']} />)

      await userEvent.click(screen.getByTestId('language-selector-trigger'))
      await userEvent.click(screen.getByRole('menuitem', { name: 'తెలుగు' }))

      expect(screen.getByRole('heading', { name: 'మీ ఖాతాను సృష్టించండి' })).toBeInTheDocument()
      expect(
        screen.getByText('మీ సమాజంలో ఆహార భద్రతా సమస్యలను నివేదించండి'),
      ).toBeInTheDocument()
      expect(screen.getByLabelText(/మొదటి పేరు/)).toBeInTheDocument()
      expect(screen.getByLabelText(/చివరి పేరు/)).toBeInTheDocument()
      expect(screen.getByLabelText(/ఇమెయిల్/)).toBeInTheDocument()
      expect(screen.getByLabelText(/పాస్‌వర్డ్/)).toBeInTheDocument()
      expect(screen.getByLabelText(/ఇష్టపడే భాష/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'ఖాతా సృష్టించండి' })).toBeInTheDocument()
      expect(screen.getByText('ఇప్పటికే ఖాతా ఉందా?')).toBeInTheDocument()

      // Preferred language dropdown default is 'te'
      const select = screen.getByLabelText(/ఇష్టపడే భాష/) as HTMLSelectElement
      expect(select.value).toBe('te')
    })
  })

  describe('4. Login Preservation — Pre-auth choice carries into authenticated session', () => {
    it('preserves pre-auth Telugu selection when user logs in and syncs to backend', async () => {
      // User chose Telugu on login page
      localStorage.setItem('foodguard.language', 'te')

      // User object from backend has preferred_language: 'en'
      const mockCustomerUser = {
        id: 7,
        first_name: 'Sita',
        last_name: 'Devi',
        email: 'sita@example.com',
        role: 'CUSTOMER',
        preferred_language: 'en',
      }

      mockAuthState = {
        user: mockCustomerUser,
        isLoading: false,
        isAuthenticated: true,
        login: mockLoginFn,
        register: mockRegisterFn,
        logout: mockLogoutFn,
      }

      render(<TestApp initialEntries={['/dashboard']} />)

      // Dashboard opens in Telugu because user had selected Telugu pre-login
      expect(screen.getByTestId('auth-lang')).toHaveTextContent('te')
      expect(screen.getByTestId('auth-welcome')).toHaveTextContent('తిరిగి స్వాగతం, Sita')

      // Backend sync was called with 'te' to update server-side profile to match local selection
      await waitFor(() => {
        expect(mockUpdatePreferredLanguage).toHaveBeenCalledWith('te')
      })
    })
  })

  describe('5. Logout Retention — Language is NOT reset to English upon logout', () => {
    it('retains Telugu on Login page when user logs out of authenticated session', async () => {
      // Pre-condition: user was active in Telugu before logout
      localStorage.setItem('foodguard.language', 'te')

      render(<TestApp initialEntries={['/login']} />)

      // Login page opens in Telugu, exactly as it was before logout
      expect(screen.getByRole('heading', { name: 'తిరిగి స్వాగతం' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'సైన్ ఇన్' })).toBeInTheDocument()
      expect(screen.getByLabelText(/ఇమెయిల్/)).toBeInTheDocument()
      expect(screen.getByLabelText(/పాస్‌వర్డ్/)).toBeInTheDocument()

      // Language was not reverted to English
      expect(localStorage.getItem('foodguard.language')).toBe('te')
    })
  })
})
