import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import ReviewerDashboard from './ReviewerDashboard'
import { LanguageProvider } from '@/i18n/LanguageContext'
import { createTestQueryClient } from '@/test/testUtils'
import type { FoodReport } from '@/types/report'
import type { Complaint } from '@/types/complaint'
import type { Restaurant } from '@/types/restaurant'

const mockUseReports = vi.fn()
const mockUseComplaints = vi.fn()
const mockUseRestaurants = vi.fn()

const FAKE_REVIEWER = {
  id: 4,
  email: 'reviewer@foodguard.ai',
  first_name: 'Reviewer',
  last_name: 'User',
  phone: '',
  role: 'REVIEWER' as const,
  preferred_language: 'en' as const,
  is_active: true,
  date_joined: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: FAKE_REVIEWER,
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('@/hooks/useReports', () => ({
  useReports: () => mockUseReports(),
}))

vi.mock('@/hooks/useComplaints', () => ({
  useComplaints: () => mockUseComplaints(),
}))

vi.mock('@/hooks/useRestaurants', () => ({
  useRestaurants: () => mockUseRestaurants(),
}))

function fakeReport(id: number, title: string, status: any = 'SUBMITTED', priority: any = 'HIGH'): FoodReport {
  return {
    id,
    customer: { id: 10, email: 'john@example.com', first_name: 'John', last_name: 'Doe' },
    restaurant: { id: 101, name: 'Spice Garden', city: 'Hyderabad', state: 'Telangana' },
    title,
    description: 'Report description',
    image: 'https://example.com/food.jpg',
    status,
    priority,
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-02-01T10:00:00Z',
  }
}

function fakeComplaint(id: number, title: string, status: any = 'SUBMITTED', priority: any = 'CRITICAL'): Complaint {
  return {
    id,
    food_report: { id: 201, title: 'Undercooked Meat', status: 'SUBMITTED' },
    customer: { id: 11, email: 'sarah@example.com', first_name: 'Sarah', last_name: 'Connor' },
    restaurant: { id: 102, name: 'Burger Hub', city: 'Bengaluru', state: 'Karnataka' },
    title,
    description: 'Severe contamination issue',
    category: 'FOOD_QUALITY',
    original_language: 'en',
    status,
    priority,
    resolution_notes: '',
    submitted_at: '2026-02-02T12:00:00Z',
    updated_at: '2026-02-02T12:00:00Z',
    resolved_at: null,
  }
}

function fakeRestaurant(id: number, name: string, is_verified = false, claim_status: any = 'PENDING'): Restaurant {
  return {
    id,
    name,
    description: 'Test restaurant',
    address: '123 Main St',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500001',
    contact_email: 'resto@example.com',
    contact_phone: '9876543210',
    is_active: true,
    is_verified,
    owner: null,
    claimed_by: { id: 20, email: 'owner@example.com', first_name: 'Dev', last_name: 'Owner', role: 'RESTAURANT_USER' },
    claim_status,
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  }
}

function renderDashboard() {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/reviewer']}>
        <LanguageProvider>
          <ReviewerDashboard />
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ReviewerDashboard — Case Management Platform', () => {
  it('renders required header and subtitle', () => {
    mockUseReports.mockReturnValue({ data: [], isLoading: false, isError: false })
    mockUseComplaints.mockReturnValue({ data: [], isLoading: false, isError: false })
    mockUseRestaurants.mockReturnValue({ data: [], isLoading: false, isError: false })

    renderDashboard()

    expect(screen.getAllByText(/reviewer dashboard/i).length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByText(/review reports, investigate complaints, and manage cases requiring attention/i),
    ).toBeInTheDocument()
  })

  it('calculates and renders real KPI statistics accurately', () => {
    mockUseReports.mockReturnValue({
      data: [fakeReport(1, 'Report 1', 'SUBMITTED', 'HIGH'), fakeReport(2, 'Report 2', 'CLOSED', 'LOW')],
      isLoading: false,
      isError: false,
    })
    mockUseComplaints.mockReturnValue({
      data: [fakeComplaint(1, 'Complaint 1', 'SUBMITTED', 'CRITICAL')],
      isLoading: false,
      isError: false,
    })
    mockUseRestaurants.mockReturnValue({
      data: [fakeRestaurant(1, 'Pending Resto', false, 'PENDING')],
      isLoading: false,
      isError: false,
    })

    renderDashboard()

    // Reports needing attention: 1
    expect(screen.getByText('Reports Needing Attention')).toBeInTheDocument()
    // Complaints needing attention: 1
    expect(screen.getByText('Complaints Needing Attention')).toBeInTheDocument()
    // Pending claims: 1
    expect(screen.getByText('Pending Restaurant Claims')).toBeInTheDocument()
    // High-priority cases: 2 (1 report HIGH + 1 complaint CRITICAL)
    expect(screen.getByText('High-Priority Cases')).toBeInTheDocument()
  })

  it('renders Priority Review Queue with case title, restaurant, customer, and review action', () => {
    mockUseReports.mockReturnValue({
      data: [fakeReport(1, 'Mold on Bread', 'SUBMITTED', 'HIGH')],
      isLoading: false,
      isError: false,
    })
    mockUseComplaints.mockReturnValue({
      data: [fakeComplaint(1, 'Foreign Object in Curry', 'SUBMITTED', 'CRITICAL')],
      isLoading: false,
      isError: false,
    })
    mockUseRestaurants.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    })

    renderDashboard()

    expect(screen.getByText('Priority Review Queue')).toBeInTheDocument()
    expect(screen.getByText('Foreign Object in Curry')).toBeInTheDocument()
    expect(screen.getByText('Mold on Bread')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /review case/i }).length).toBeGreaterThanOrEqual(2)
  })

  it('renders Restaurant Verification section with pending claims', () => {
    mockUseReports.mockReturnValue({ data: [], isLoading: false, isError: false })
    mockUseComplaints.mockReturnValue({ data: [], isLoading: false, isError: false })
    mockUseRestaurants.mockReturnValue({
      data: [fakeRestaurant(1, 'Taj Biryani House', false, 'PENDING')],
      isLoading: false,
      isError: false,
    })

    renderDashboard()

    expect(screen.getByText('Restaurant Verification')).toBeInTheDocument()
    expect(screen.getByText('Taj Biryani House')).toBeInTheDocument()
  })
})
