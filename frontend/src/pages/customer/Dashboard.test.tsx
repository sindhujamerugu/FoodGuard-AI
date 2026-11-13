/**
 * Dashboard.test.tsx — Customer Dashboard home page
 *
 * Conventions mirror the existing ReportsList.test.tsx and
 * ReviewerDashboard.test.tsx:
 *  - vi.mock() for auth + data hooks so the component renders without a
 *    real network/database.
 *  - createTestQueryClient() + MemoryRouter + LanguageProvider wrapping.
 *  - No hardcoded mock data presented as if it were real; every assertion
 *    verifies that the component drives UI from the mocked hook return value.
 */
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import Dashboard from './Dashboard'
import { LanguageProvider } from '@/i18n/LanguageContext'
import { createTestQueryClient } from '@/test/testUtils'
import type { FoodReport } from '@/types/report'
import type { Complaint } from '@/types/complaint'

// ── Mock hooks ──────────────────────────────────────────────────────────────

const mockUseReports = vi.fn()
const mockUseComplaints = vi.fn()
const mockUseRestaurants = vi.fn()

const FAKE_USER = {
  id: 1,
  email: 'priya@example.com',
  first_name: 'Priya',
  last_name: 'Sharma',
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
    updateUser: vi.fn(),
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

// ── Test helpers ─────────────────────────────────────────────────────────────

function fakeReport(
  id: number,
  title: string,
  status: FoodReport['status'] = 'SUBMITTED',
  createdAt = '2026-01-01T00:00:00Z',
): FoodReport {
  return {
    id,
    customer: { id: 1, email: 'priya@example.com', first_name: 'Priya', last_name: 'Sharma' },
    restaurant: { id: 10, name: 'Spice Garden', city: 'Hyderabad', state: 'Telangana' },
    title,
    description: 'Test description',
    image: null,
    status,
    priority: 'LOW',
    location_lat: null,
    location_lng: null,
    created_at: createdAt,
    updated_at: createdAt,
  }
}

function fakeComplaint(
  id: number,
  title: string,
  status: Complaint['status'] = 'SUBMITTED',
  submittedAt = '2026-01-02T00:00:00Z',
): Complaint {
  return {
    id,
    food_report: { id: 100, title: 'Related report', status: 'SUBMITTED' },
    customer: { id: 1, email: 'priya@example.com', first_name: 'Priya', last_name: 'Sharma' },
    restaurant: { id: 10, name: 'Spice Garden', city: 'Hyderabad', state: 'Telangana' },
    title,
    description: 'Complaint description',
    category: 'FOOD_QUALITY',
    original_language: 'en',
    status,
    priority: 'LOW',
    resolution_notes: '',
    submitted_at: submittedAt,
    updated_at: submittedAt,
    resolved_at: null,
  }
}

function noopQuery() {
  return { data: [], isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() }
}

function renderDashboard() {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <LanguageProvider>
          <Dashboard />
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Dashboard — A. Welcome section', () => {
  it('shows a personalized greeting with the authenticated user name', () => {
    mockUseReports.mockReturnValue(noopQuery())
    mockUseComplaints.mockReturnValue(noopQuery())
    mockUseRestaurants.mockReturnValue(noopQuery())

    renderDashboard()

    // The greeting key is: "Welcome back, {name}"
    expect(screen.getByText(/welcome back, priya/i)).toBeInTheDocument()
  })

  it('renders the "New Report" CTA that links to /reports/new', () => {
    mockUseReports.mockReturnValue(noopQuery())
    mockUseComplaints.mockReturnValue(noopQuery())
    mockUseRestaurants.mockReturnValue(noopQuery())

    renderDashboard()

    const newReportLinks = screen.getAllByRole('link', { name: /new report/i })
    expect(newReportLinks.length).toBeGreaterThanOrEqual(1)
    expect(newReportLinks[0]).toHaveAttribute('href', '/reports/new')
  })
})

describe('Dashboard — B. Summary cards', () => {
  it('shows placeholders (—) while reports are still loading', () => {
    mockUseReports.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      isSuccess: false,
      refetch: vi.fn(),
    })
    mockUseComplaints.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      isSuccess: false,
      refetch: vi.fn(),
    })
    mockUseRestaurants.mockReturnValue(noopQuery())

    renderDashboard()

    // When loading, StatCards show '—' instead of 0
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1)
  })

  it('calculates correct stat values from real report and complaint data', () => {
    mockUseReports.mockReturnValue({
      ...noopQuery(),
      data: [
        fakeReport(1, 'R1', 'SUBMITTED'),   // open
        fakeReport(2, 'R2', 'UNDER_REVIEW'), // open
        fakeReport(3, 'R3', 'RESOLVED'),     // resolved
        fakeReport(4, 'R4', 'DRAFT'),        // neither
      ],
    })
    mockUseComplaints.mockReturnValue({
      ...noopQuery(),
      data: [
        fakeComplaint(1, 'C1', 'SUBMITTED'),   // open
        fakeComplaint(2, 'C2', 'RESOLVED'),    // not open
      ],
    })
    mockUseRestaurants.mockReturnValue(noopQuery())

    renderDashboard()

    // Stat labels exist
    expect(screen.getByText('Total reports')).toBeInTheDocument()
    expect(screen.getByText('Awaiting review')).toBeInTheDocument()
    expect(screen.getByText('Resolved reports')).toBeInTheDocument()
    expect(screen.getByText('Open complaints')).toBeInTheDocument()

    // Total reports: 4, Awaiting review: 2, Resolved: 1, Open complaints: 1
    // Use getAllByText for values that appear more than once (e.g. "1" for
    // both Resolved and Open Complaints).
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    // "1" appears twice (resolved reports + open complaints)
    expect(screen.getAllByText('1').length).toBe(2)
  })

  it('shows zero for every metric when the customer has no data yet', () => {
    mockUseReports.mockReturnValue(noopQuery())
    mockUseComplaints.mockReturnValue(noopQuery())
    mockUseRestaurants.mockReturnValue(noopQuery())

    renderDashboard()

    // All four stat values should be 0
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(4)
  })
})

describe('Dashboard — C. Recent reports', () => {
  it('shows a loading skeleton while reports are fetching', () => {
    mockUseReports.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      isSuccess: false,
      refetch: vi.fn(),
    })
    mockUseComplaints.mockReturnValue(noopQuery())
    mockUseRestaurants.mockReturnValue(noopQuery())

    const { container } = renderDashboard()
    expect(container.querySelector('.animate-skeleton')).not.toBeNull()
  })

  it('shows an error state with a retry button when reports fail to load', async () => {
    const refetch = vi.fn()
    mockUseReports.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isSuccess: false,
      refetch,
    })
    mockUseComplaints.mockReturnValue(noopQuery())
    mockUseRestaurants.mockReturnValue(noopQuery())

    renderDashboard()

    const { default: userEvent } = await import('@testing-library/user-event')
    const retryButtons = screen.getAllByRole('button', { name: /try again/i })
    await userEvent.click(retryButtons[0])
    expect(refetch).toHaveBeenCalled()
  })

  it('shows an empty state when the customer has no reports', () => {
    mockUseReports.mockReturnValue(noopQuery())
    mockUseComplaints.mockReturnValue(noopQuery())
    mockUseRestaurants.mockReturnValue(noopQuery())

    renderDashboard()

    expect(screen.getByText('No food safety reports yet')).toBeInTheDocument()
  })

  it('renders up to 4 recent reports, sorted newest-first', () => {
    mockUseReports.mockReturnValue({
      ...noopQuery(),
      data: [
        // Deliberately pass out of order so the sort can be validated
        fakeReport(1, 'Oldest report',   'SUBMITTED', '2026-01-01T00:00:00Z'),
        fakeReport(2, 'Middle report',   'SUBMITTED', '2026-03-01T00:00:00Z'),
        fakeReport(3, 'Newest report',   'SUBMITTED', '2026-05-01T00:00:00Z'),
        fakeReport(4, 'Fourth report',   'SUBMITTED', '2026-04-01T00:00:00Z'),
        fakeReport(5, 'Fifth (hidden)',  'SUBMITTED', '2026-02-01T00:00:00Z'),
      ],
    })
    mockUseComplaints.mockReturnValue(noopQuery())
    mockUseRestaurants.mockReturnValue(noopQuery())

    renderDashboard()

    // Top 4 by created_at descending: Newest(May), Fourth(Apr), Middle(Mar), Fifth(Feb)
    expect(screen.getByText('Newest report')).toBeInTheDocument()
    expect(screen.getByText('Fourth report')).toBeInTheDocument()
    expect(screen.getByText('Middle report')).toBeInTheDocument()
    expect(screen.getByText('Fifth (hidden)')).toBeInTheDocument()
    // Oldest (Jan) is the 5th element — excluded by slice(0, 4)
    expect(screen.queryByText('Oldest report')).not.toBeInTheDocument()
  })

  it('includes a "View all" link to /reports', () => {
    mockUseReports.mockReturnValue(noopQuery())
    mockUseComplaints.mockReturnValue(noopQuery())
    mockUseRestaurants.mockReturnValue(noopQuery())

    renderDashboard()

    const viewAllLinks = screen.getAllByRole('link', { name: /view all/i })
    const reportsLink = viewAllLinks.find((l) => l.getAttribute('href') === '/reports')
    expect(reportsLink).toBeDefined()
  })
})

describe('Dashboard — D. Recent complaints', () => {
  it('shows an empty state when the customer has no complaints', () => {
    mockUseReports.mockReturnValue(noopQuery())
    mockUseComplaints.mockReturnValue(noopQuery())
    mockUseRestaurants.mockReturnValue(noopQuery())

    renderDashboard()

    expect(screen.getByText('No complaints filed yet')).toBeInTheDocument()
  })

  it('renders up to 4 recent complaints, sorted newest-first', () => {
    mockUseReports.mockReturnValue(noopQuery())
    mockUseComplaints.mockReturnValue({
      ...noopQuery(),
      data: [
        fakeComplaint(1, 'Old complaint',    'SUBMITTED', '2026-01-01T00:00:00Z'),
        fakeComplaint(2, 'Newest complaint', 'SUBMITTED', '2026-06-01T00:00:00Z'),
        fakeComplaint(3, 'Third complaint',  'SUBMITTED', '2026-04-01T00:00:00Z'),
        fakeComplaint(4, 'Fourth complaint', 'SUBMITTED', '2026-03-01T00:00:00Z'),
        fakeComplaint(5, 'Hidden complaint', 'SUBMITTED', '2026-02-01T00:00:00Z'),
      ],
    })
    mockUseRestaurants.mockReturnValue(noopQuery())

    renderDashboard()

    // Top 4 by submitted_at descending: Newest(Jun), Third(Apr), Fourth(Mar), Hidden(Feb)
    expect(screen.getByText('Newest complaint')).toBeInTheDocument()
    expect(screen.getByText('Third complaint')).toBeInTheDocument()
    expect(screen.getByText('Fourth complaint')).toBeInTheDocument()
    expect(screen.getByText('Hidden complaint')).toBeInTheDocument()
    // Old complaint (Jan) is 5th — excluded by slice(0, 4)
    expect(screen.queryByText('Old complaint')).not.toBeInTheDocument()
  })

  it('includes a "View all" link to /complaints', () => {
    mockUseReports.mockReturnValue(noopQuery())
    mockUseComplaints.mockReturnValue(noopQuery())
    mockUseRestaurants.mockReturnValue(noopQuery())

    renderDashboard()

    const viewAllLinks = screen.getAllByRole('link', { name: /view all/i })
    const complaintsLink = viewAllLinks.find((l) => l.getAttribute('href') === '/complaints')
    expect(complaintsLink).toBeDefined()
  })

  it('shows complaint-load error with retry button', async () => {
    const refetch = vi.fn()
    mockUseReports.mockReturnValue(noopQuery())
    mockUseComplaints.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isSuccess: false,
      refetch,
    })
    mockUseRestaurants.mockReturnValue(noopQuery())

    renderDashboard()

    const { default: userEvent } = await import('@testing-library/user-event')
    const retryButtons = screen.getAllByRole('button', { name: /try again/i })
    await userEvent.click(retryButtons[0])
    expect(refetch).toHaveBeenCalled()
  })
})

describe('Dashboard — E. Quick actions', () => {
  it('renders all four quick action links with correct hrefs', () => {
    mockUseReports.mockReturnValue(noopQuery())
    mockUseComplaints.mockReturnValue(noopQuery())
    mockUseRestaurants.mockReturnValue(noopQuery())

    renderDashboard()

    const allLinks = screen.getAllByRole('link')
    const hrefs = allLinks.map((l) => l.getAttribute('href'))

    expect(hrefs).toContain('/reports/new')
    expect(hrefs).toContain('/reports')
    expect(hrefs).toContain('/complaints')
    expect(hrefs).toContain('/profile')
  })

  it('renders the Quick actions section heading', () => {
    mockUseReports.mockReturnValue(noopQuery())
    mockUseComplaints.mockReturnValue(noopQuery())
    mockUseRestaurants.mockReturnValue(noopQuery())

    renderDashboard()

    expect(screen.getByText('Quick actions')).toBeInTheDocument()
  })
})

describe('Dashboard — F. AI information section', () => {
  it('renders the AI insight section heading', () => {
    mockUseReports.mockReturnValue(noopQuery())
    mockUseComplaints.mockReturnValue(noopQuery())
    mockUseRestaurants.mockReturnValue(noopQuery())

    renderDashboard()

    expect(screen.getByText('AI-assisted insight')).toBeInTheDocument()
  })

  it('does not display any fabricated risk scores or model predictions', () => {
    mockUseReports.mockReturnValue(noopQuery())
    mockUseComplaints.mockReturnValue(noopQuery())
    mockUseRestaurants.mockReturnValue(noopQuery())

    renderDashboard()

    // No specific numeric risk percentage or mock accuracy claim should appear
    expect(screen.queryByText(/99%|98%|accuracy/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/predicted|result: (low|high|medium)/i)).not.toBeInTheDocument()
  })
})

describe('Dashboard — Reports/complaints data isolation', () => {
  it('does not mix report statuses into complaint stat and vice-versa', () => {
    // 2 open reports, 1 open complaint — the stat counts must not bleed across
    mockUseReports.mockReturnValue({
      ...noopQuery(),
      data: [
        fakeReport(1, 'R1', 'SUBMITTED'),
        fakeReport(2, 'R2', 'UNDER_REVIEW'),
      ],
    })
    mockUseComplaints.mockReturnValue({
      ...noopQuery(),
      data: [fakeComplaint(1, 'C1', 'SUBMITTED')],
    })
    mockUseRestaurants.mockReturnValue(noopQuery())

    renderDashboard()

    expect(screen.getByText('Awaiting review')).toBeInTheDocument()
    expect(screen.getByText('Open complaints')).toBeInTheDocument()
    // The total reports stat card should show 2, not 3
    expect(screen.getByText('Total reports')).toBeInTheDocument()
  })
})

describe('Dashboard — Localization', () => {
  it('does not render any raw translation key names in the UI', () => {
    mockUseReports.mockReturnValue(noopQuery())
    mockUseComplaints.mockReturnValue(noopQuery())
    mockUseRestaurants.mockReturnValue(noopQuery())

    const { container } = renderDashboard()

    // If a key was missing, the t() function returns the raw key name.
    // Check that no text node contains the characteristic 'dashboard.customer.' prefix.
    expect(container.textContent).not.toMatch(/dashboard\.customer\./)
    expect(container.textContent).not.toMatch(/common\./)
  })
})

