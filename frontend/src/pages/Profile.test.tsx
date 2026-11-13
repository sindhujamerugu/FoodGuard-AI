import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider, useLanguage } from '@/i18n/LanguageContext'
import Profile from './Profile'
import type { User } from '@/types/user'
import { authApi } from '@/api/auth'
import { createTestQueryClient } from '@/test/testUtils'

let mockUser: User = {
  id: 1,
  first_name: 'Ragamala',
  last_name: 'Nasani',
  email: 'ragamalanasani@gmail.com',
  phone: '',
  role: 'CUSTOMER',
  preferred_language: 'en',
  is_active: true,
  date_joined: '2026-10-03T10:00:00Z',
  updated_at: '2026-10-03T10:00:00Z',
}

const mockUpdateUser = vi.fn()

function renderProfile() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <LanguageProvider>
          <Profile />
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    updateUser: mockUpdateUser,
  }),
}))

vi.mock('@/api/auth', () => ({
  authApi: {
    updateProfile: vi.fn(),
    updatePreferredLanguage: vi.fn().mockResolvedValue({} as any),
  },
}))

describe('Profile Page & Customer Profile Completion', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    mockUser = {
      id: 1,
      first_name: 'Ragamala',
      last_name: 'Nasani',
      email: 'ragamalanasani@gmail.com',
      phone: '',
      role: 'CUSTOMER',
      preferred_language: 'en',
      is_active: true,
      date_joined: '2026-10-03T10:00:00Z',
      updated_at: '2026-10-03T10:00:00Z',
    }
    mockUpdateUser.mockImplementation((updated: Partial<User>) => {
      Object.assign(mockUser, updated)
    })
  })

  it('renders the complete SaaS profile layout with header, personal info, and account details', () => {
    renderProfile()

    // Page Header
    expect(screen.getAllByText('Profile').length).toBeGreaterThanOrEqual(1)

    // Profile Header Card
    expect(screen.getAllByText('RN').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('heading', { name: 'Ragamala Nasani' })).toBeInTheDocument()
    expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: /Edit Profile/i })).toBeInTheDocument()

    // Personal Information Section
    expect(screen.getByRole('heading', { level: 2, name: 'Personal information' })).toBeInTheDocument()
    expect(screen.getByText('Full name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getAllByText('ragamalanasani@gmail.com').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Phone')).toBeInTheDocument()
    expect(screen.getByText('Not provided')).toBeInTheDocument()
    expect(screen.getByText('Role')).toBeInTheDocument()

    // Account Details Section
    expect(screen.getByRole('heading', { level: 2, name: 'Account details' })).toBeInTheDocument()
    expect(screen.getByText('Preferred language')).toBeInTheDocument()
    expect(screen.getAllByText('English').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Member since')).toBeInTheDocument()
    expect(screen.getByText('Account status')).toBeInTheDocument()

    // Managed notice
    expect(screen.getByText(/Profile details are managed by FoodGuard AI administrators/)).toBeInTheDocument()
  })

  it('renders correctly with phone number provided', () => {
    mockUser.phone = '+91 9876543210'

    renderProfile()

    expect(screen.getByText('+91 9876543210')).toBeInTheDocument()
    expect(screen.queryByText('Not provided')).not.toBeInTheDocument()
  })

  it('correctly adapts role badges and labels for all four roles', () => {
    // 1. Restaurant Partner
    mockUser.role = 'RESTAURANT_USER'
    const { rerender } = renderProfile()
    expect(screen.getAllByText('Restaurant').length).toBeGreaterThanOrEqual(1)

    // 2. Reviewer
    mockUser.role = 'REVIEWER'
    rerender(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <LanguageProvider>
            <Profile />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getAllByText('Reviewer').length).toBeGreaterThanOrEqual(1)

    // 3. Admin
    mockUser.role = 'ADMIN'
    rerender(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <LanguageProvider>
            <Profile />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1)
  })

  it('opens edit dialog with prefilled data and cancel button discards changes', async () => {
    const user = userEvent.setup()
    renderProfile()

    // Open edit dialog
    await user.click(screen.getByRole('button', { name: /Edit Profile/i }))

    // Dialog appears with title
    expect(screen.getByRole('heading', { level: 2, name: 'Edit Profile' })).toBeInTheDocument()

    // Form inputs prefilled with current values
    const firstNameInput = screen.getByLabelText(/First name/i)
    const lastNameInput = screen.getByLabelText(/Last name/i)
    const phoneInput = screen.getByLabelText(/Phone/i)
    const languageSelect = screen.getByLabelText(/Preferred language/i)

    expect(firstNameInput).toHaveValue('Ragamala')
    expect(lastNameInput).toHaveValue('Nasani')
    expect(phoneInput).toHaveValue('')
    expect(languageSelect).toHaveValue('en')

    // Modify first name and cancel
    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'ModifiedName')
    expect(firstNameInput).toHaveValue('ModifiedName')

    // Click Cancel
    await user.click(screen.getByRole('button', { name: /Cancel/i }))

    // Modal closes
    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 2, name: 'Edit Profile' })).not.toBeInTheDocument()
    })

    // Profile page still displays original name
    expect(screen.getAllByText('Ragamala Nasani').length).toBeGreaterThanOrEqual(1)
    expect(vi.mocked(authApi.updateProfile)).not.toHaveBeenCalled()
  })

  it('displays inline validation errors when required fields are blank or invalid', async () => {
    const user = userEvent.setup()
    renderProfile()

    await user.click(screen.getByRole('button', { name: /Edit Profile/i }))

    const firstNameInput = screen.getByLabelText(/First name/i)
    const lastNameInput = screen.getByLabelText(/Last name/i)
    const phoneInput = screen.getByLabelText(/Phone/i)

    // Clear required fields
    await user.clear(firstNameInput)
    await user.clear(lastNameInput)
    await user.type(phoneInput, '123') // Invalid phone format

    await user.click(screen.getByRole('button', { name: /Save changes/i }))

    // Validation errors rendered
    expect(await screen.findByText('First name is required.')).toBeInTheDocument()
    expect(screen.getByText('Last name is required.')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid phone number (7–20 digits).')).toBeInTheDocument()

    expect(vi.mocked(authApi.updateProfile)).not.toHaveBeenCalled()
  })

  it('submits valid changes and updates visible profile, AuthContext, and gives success feedback', async () => {
    const user = userEvent.setup()
    const updatedUser: User = {
      ...mockUser,
      first_name: 'Priya',
      last_name: 'Reddy',
      phone: '+91 9876543210',
      preferred_language: 'te',
    }

    vi.mocked(authApi.updateProfile).mockResolvedValueOnce(updatedUser)

    const { rerender } = render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <LanguageProvider>
            <Profile />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('button', { name: /Edit Profile/i }))

    const firstNameInput = screen.getByLabelText(/First name/i)
    const lastNameInput = screen.getByLabelText(/Last name/i)
    const phoneInput = screen.getByLabelText(/Phone/i)
    const langSelect = screen.getByLabelText(/Preferred language/i)

    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'Priya')
    await user.clear(lastNameInput)
    await user.type(lastNameInput, 'Reddy')
    await user.clear(phoneInput)
    await user.type(phoneInput, '+91 9876543210')
    await user.selectOptions(langSelect, 'te')

    await user.click(screen.getByRole('button', { name: /Save changes/i }))

    // API called with permitted fields
    await waitFor(() => {
      expect(vi.mocked(authApi.updateProfile)).toHaveBeenCalledWith({
        first_name: 'Priya',
        last_name: 'Reddy',
        phone: '+91 9876543210',
        preferred_language: 'te',
      })
    })

    // AuthContext updateUser called
    expect(mockUpdateUser).toHaveBeenCalledWith(updatedUser)

    // Modal closed
    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 2, name: 'Edit Profile' })).not.toBeInTheDocument()
    })

    // Success feedback rendered
    expect(screen.getByRole('status')).toBeInTheDocument()

    // Rerender reflects updated user
    rerender(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <LanguageProvider>
            <Profile />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getAllByText('Priya Reddy').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('+91 9876543210')).toBeInTheDocument()
  })

  it('handles API failures and displays accessible error feedback', async () => {
    const user = userEvent.setup()
    vi.mocked(authApi.updateProfile).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 400,
        data: { phone: ['Enter a valid phone number (7–20 digits, optional +/spaces/dashes).'] },
      },
    })

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <LanguageProvider>
            <Profile />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('button', { name: /Edit Profile/i }))
    await user.click(screen.getByRole('button', { name: /Save changes/i }))

    // Error alert is displayed inside the modal
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/Enter a valid phone number/i)

    // Modal remains open so user can fix and retry
    expect(screen.getByRole('heading', { level: 2, name: 'Edit Profile' })).toBeInTheDocument()
  })

  it('ensures email and role remain strictly read-only in both page and edit modal', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter>
          <LanguageProvider>
            <Profile />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    // Open edit dialog
    await user.click(screen.getByRole('button', { name: /Edit Profile/i }))

    // Email and role are displayed inside read-only security box, NOT editable inputs
    expect(screen.getByText('Email and role are managed for security and cannot be changed here.')).toBeInTheDocument()
    expect(screen.getAllByText('ragamalanasani@gmail.com').length).toBeGreaterThanOrEqual(2)

    // No editable input controls exist for email or role
    expect(screen.queryByRole('textbox', { name: /Email/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /Role/i })).not.toBeInTheDocument()
  })

  it('switches full Profile UI language dynamically into Telugu, Hindi, Tamil, Kannada, and Marathi', async () => {
    function LanguageSwitcherProbe() {
      const { setLanguage } = useLanguage()
      return (
        <MemoryRouter>
          <button onClick={() => setLanguage('te')}>switch-te</button>
          <button onClick={() => setLanguage('hi')}>switch-hi</button>
          <button onClick={() => setLanguage('ta')}>switch-ta</button>
          <button onClick={() => setLanguage('kn')}>switch-kn</button>
          <button onClick={() => setLanguage('mr')}>switch-mr</button>
          <Profile />
        </MemoryRouter>
      )
    }

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <LanguageProvider>
          <LanguageSwitcherProbe />
        </LanguageProvider>
      </QueryClientProvider>,
    )

    // Default English
    expect(screen.getByText('Personal information')).toBeInTheDocument()
    expect(screen.getByText('Account details')).toBeInTheDocument()
    expect(screen.getByText('Edit Profile')).toBeInTheDocument()

    // 1. Switch to Telugu
    await userEvent.click(screen.getByText('switch-te'))
    expect(screen.getByText('వ్యక్తిగత సమాచారం')).toBeInTheDocument()
    expect(screen.getByText('పూర్తి పేరు')).toBeInTheDocument()
    expect(screen.getByText('ఖాతా వివరాలు')).toBeInTheDocument()
    expect(screen.getByText('ఖాతా స్థితి')).toBeInTheDocument()
    expect(screen.getByText('ప్రొఫైల్‌ను సవరించండి')).toBeInTheDocument()
    expect(screen.getAllByText('క్రియాశీలం').length).toBeGreaterThanOrEqual(1)

    // 2. Switch to Hindi
    await userEvent.click(screen.getByText('switch-hi'))
    expect(screen.getByText('व्यक्तिगत जानकारी')).toBeInTheDocument()
    expect(screen.getByText('पूरा नाम')).toBeInTheDocument()
    expect(screen.getByText('खाता विवरण')).toBeInTheDocument()
    expect(screen.getByText('खाता स्थिति')).toBeInTheDocument()
    expect(screen.getByText('प्रोफ़ाइल संपादित करें')).toBeInTheDocument()
    expect(screen.getAllByText('सक्रिय').length).toBeGreaterThanOrEqual(1)

    // 3. Switch to Tamil
    await userEvent.click(screen.getByText('switch-ta'))
    expect(screen.getByText('தனிப்பட்ட தகவல்')).toBeInTheDocument()
    expect(screen.getByText('முழு பெயர்')).toBeInTheDocument()
    expect(screen.getByText('கணக்கு விவரங்கள்')).toBeInTheDocument()
    expect(screen.getByText('கணக்கு நிலை')).toBeInTheDocument()
    expect(screen.getByText('சுயவிவரத்தைத் திருத்து')).toBeInTheDocument()
    expect(screen.getAllByText('செயலில்').length).toBeGreaterThanOrEqual(1)

    // 4. Switch to Kannada
    await userEvent.click(screen.getByText('switch-kn'))
    expect(screen.getByText('ವೈಯಕ್ತಿಕ ಮಾಹಿತಿ')).toBeInTheDocument()
    expect(screen.getByText('ಪೂರ್ಣ ಹೆಸರು')).toBeInTheDocument()
    expect(screen.getByText('ಖಾತೆ ವಿವರಗಳು')).toBeInTheDocument()
    expect(screen.getByText('ಖಾತೆಯ ಸ್ಥಿತಿ')).toBeInTheDocument()
    expect(screen.getByText('ಪ್ರೊಫೈಲ್ ಸಂಪಾದಿಸಿ')).toBeInTheDocument()
    expect(screen.getAllByText('ಸಕ್ರಿಯ').length).toBeGreaterThanOrEqual(1)

    // 5. Switch to Marathi
    await userEvent.click(screen.getByText('switch-mr'))
    expect(screen.getByText('वैयक्तिक माहिती')).toBeInTheDocument()
    expect(screen.getByText('पूर्ण नाव')).toBeInTheDocument()
    expect(screen.getByText('खाते तपशील')).toBeInTheDocument()
    expect(screen.getByText('खाते स्थिती')).toBeInTheDocument()
    expect(screen.getByText('प्रोफाइल संपादित करा')).toBeInTheDocument()
    expect(screen.getAllByText('सक्रिय').length).toBeGreaterThanOrEqual(1)
  })
})
