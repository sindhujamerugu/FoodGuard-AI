import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ReportForm } from './ReportForm'
import { LanguageProvider } from '@/i18n/LanguageContext'
import { createTestQueryClient } from '@/test/testUtils'
import type { Restaurant } from '@/types/restaurant'

const SAMPLE_RESTAURANTS: Restaurant[] = [
  {
    id: 1,
    name: 'Spice Garden',
    description: 'South Indian cuisine',
    address: '12 MG Road',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500001',
    contact_email: 'spice@example.com',
    contact_phone: '+91-9876543210',
    owner: null,
    is_verified: true,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

const mockCreateReportMutateAsync = vi.fn()
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@/hooks/useRestaurants', () => ({
  useRestaurants: () => ({
    data: SAMPLE_RESTAURANTS,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateRestaurant: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

const FAKE_USER = {
  id: 1,
  email: 'c@example.com',
  first_name: 'Test',
  last_name: 'Customer',
  phone: '',
  role: 'CUSTOMER' as const,
  preferred_language: 'en' as const,
  is_active: true,
  date_joined: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: FAKE_USER,
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('@/hooks/useReports', () => ({
  useCreateReport: () => ({
    mutateAsync: mockCreateReportMutateAsync,
    isPending: false,
  }),
  useUpdateReport: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

function renderForm(ui: React.ReactElement) {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/reports/new']}>
        <LanguageProvider>{ui}</LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ReportForm with RestaurantSearchSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders restaurant search, title, description, and validates required fields', async () => {
    const user = userEvent.setup()
    renderForm(<ReportForm mode="create" />)

    expect(screen.getByRole('combobox', { name: /search restaurant/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/^Title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Description\s*\*/i)).toBeInTheDocument()

    // Submit without selecting restaurant
    const submitBtn = screen.getByRole('button', { name: /Save Draft/i })
    await user.click(submitBtn)

    expect(await screen.findByText('Select a restaurant.')).toBeInTheDocument()
    expect(mockCreateReportMutateAsync).not.toHaveBeenCalled()
  })

  it('successfully submits report when restaurant is selected and navigates to report detail', async () => {
    const user = userEvent.setup()
    mockCreateReportMutateAsync.mockResolvedValueOnce({ id: 42 })

    renderForm(<ReportForm mode="create" />)

    // Select restaurant from search dropdown
    const combobox = screen.getByRole('combobox', { name: /search restaurant/i })
    await user.click(combobox)

    const option = await screen.findByRole('option', { name: /Spice Garden/i })
    await user.click(option)

    // Fill title and description
    await user.type(screen.getByLabelText(/^Title/i), 'Stale Biryani Issue')
    await user.type(screen.getByLabelText(/^Description\s*\*/i), 'Found bad smell in the food.')

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Save Draft/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(mockCreateReportMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          restaurant: 1,
          title: 'Stale Biryani Issue',
          description: 'Found bad smell in the food.',
        }),
      )
      expect(mockNavigate).toHaveBeenCalledWith('/reports/42')
    })
  })
})
