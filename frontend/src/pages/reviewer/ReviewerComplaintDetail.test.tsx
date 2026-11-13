import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import ReviewerComplaintDetail from './ReviewerComplaintDetail'
import { ComplaintLocationMapCard } from '@/components/reviewer/ComplaintLocationMapCard'
import { LanguageProvider } from '@/i18n/LanguageContext'
import { createTestQueryClient } from '@/test/testUtils'
import type { Complaint } from '@/types/complaint'
import type { FoodReport } from '@/types/report'

const mockUseComplaint = vi.fn()
const mockMutateAsync = vi.fn()
const mockUseReport = vi.fn()
const mockUseAIAnalysis = vi.fn()
const mockUseRunAIAnalysis = vi.fn()
const mockUseEscalations = vi.fn()

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

vi.mock('@/hooks/useComplaints', () => ({
  useComplaint: () => mockUseComplaint(),
  useUpdateComplaint: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

vi.mock('@/hooks/useReports', () => ({
  useReport: () => mockUseReport(),
}))

vi.mock('@/hooks/useAIAnalysis', () => ({
  useAIAnalysis: () => mockUseAIAnalysis(),
  useRunAIAnalysis: () => mockUseRunAIAnalysis(),
}))

vi.mock('@/hooks/useEscalations', () => ({
  useEscalations: () => mockUseEscalations(),
  useCreateEscalation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, center, zoom, scrollWheelZoom, ...props }: any) => (
    <div data-testid="location-map" {...props}>{children}</div>
  ),
  TileLayer: ({ eventHandlers, url, attribution, ...props }: any) => (
    <div data-testid="map-tile-layer" onClick={() => eventHandlers?.tileerror?.({})} {...props}>
      {url}
    </div>
  ),
  Marker: ({ children, position, icon, ...props }: any) => <div data-testid="map-marker" {...props}>{children}</div>,
  Popup: ({ children }: any) => <div>{children}</div>,
}))

const FAKE_REPORT: FoodReport = {
  id: 10,
  customer: { id: 1, email: 'cust@example.com', first_name: 'Jane', last_name: 'Doe' },
  restaurant: { id: 2, name: 'Biryani House', city: 'Hyderabad', state: 'Telangana' },
  title: 'Foreign body in biryani',
  description: 'Found a plastic piece in biryani.',
  image: null,
  status: 'SUBMITTED',
  priority: 'MEDIUM',
  location_lat: '17.385',
  location_lng: '78.4867',
  created_at: '2026-02-10T10:00:00Z',
  updated_at: '2026-02-10T10:00:00Z',
}

const FAKE_COMPLAINT_UNDER_REVIEW: Complaint = {
  id: 99,
  food_report: { id: 10, title: 'Foreign body in biryani', status: 'SUBMITTED' },
  customer: { id: 1, email: 'cust@example.com', first_name: 'Jane', last_name: 'Doe', preferred_language: 'en' },
  restaurant: { id: 2, name: 'Biryani House', city: 'Hyderabad', state: 'Telangana' },
  title: 'Formal complaint: Plastic in food',
  description: 'Severe grievance regarding food quality.',
  category: 'FOREIGN_OBJECT',
  original_language: 'en',
  status: 'UNDER_REVIEW',
  priority: 'HIGH',
  resolution_notes: '',
  submitted_at: '2026-02-10T10:30:00Z',
  updated_at: '2026-02-10T11:00:00Z',
  resolved_at: null,
}

const FAKE_COMPLAINT_REJECTED: Complaint = {
  ...FAKE_COMPLAINT_UNDER_REVIEW,
  status: 'REJECTED',
  rejection_reason: 'Unverifiable customer statement with no physical sample or receipt provided.',
  rejected_by: { id: 4, email: 'reviewer@foodguard.ai', first_name: 'Reviewer', last_name: 'User', preferred_language: 'en' },
  rejected_at: '2026-02-10T12:00:00Z',
}

function renderComplaintDetail() {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/reviewer/complaints/99']}>
        <LanguageProvider>
          <Routes>
            <Route path="/reviewer/complaints/:id" element={<ReviewerComplaintDetail />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ComplaintLocationMapCard', () => {
  it('renders a valid map and latitude/longitude values for complaint coordinates', () => {
    render(
      <LanguageProvider>
        <ComplaintLocationMapCard latitude="17.385083" longitude="78.486671" locationName="Biryani House" />
      </LanguageProvider>,
    )

    expect(screen.getByTestId('location-map')).toBeInTheDocument()
    expect(screen.getByText(/Complaint location/i)).toBeInTheDocument()
    expect(screen.getAllByText(/17\.385083/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/78\.486671/i).length).toBeGreaterThan(0)
  })

  it('shows a friendly fallback when the complaint has no valid coordinates', () => {
    render(
      <LanguageProvider>
        <ComplaintLocationMapCard latitude={null} longitude={null} />
      </LanguageProvider>,
    )

    expect(screen.getByText(/Location information unavailable/i)).toBeInTheDocument()
    expect(screen.queryByTestId('location-map')).not.toBeInTheDocument()
  })

  it('handles a map tile failure without crashing the reviewer page', () => {
    render(
      <LanguageProvider>
        <ComplaintLocationMapCard latitude="17.385083" longitude="78.486671" />
      </LanguageProvider>,
    )

    fireEvent.click(screen.getByTestId('map-tile-layer'))

    expect(screen.getByText(/Map preview unavailable/i)).toBeInTheDocument()
  })
})

describe('ReviewerComplaintDetail — Rejection Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseReport.mockReturnValue({ data: FAKE_REPORT, isLoading: false })
    mockUseAIAnalysis.mockReturnValue({ data: null, isLoading: false, isError: true, error: { response: { status: 404 } } })
    mockUseRunAIAnalysis.mockReturnValue({ mutate: vi.fn(), isPending: false })
    mockUseEscalations.mockReturnValue({ data: [], isLoading: false })
  })

  it('renders Reject Complaint button for complaints in UNDER_REVIEW status', () => {
    mockUseComplaint.mockReturnValue({
      data: FAKE_COMPLAINT_UNDER_REVIEW,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })

    renderComplaintDetail()

    expect(screen.getByRole('button', { name: /Reject Complaint/i })).toBeInTheDocument()
  })

  it('opens RejectComplaintModal when Reject Complaint button is clicked', async () => {
    mockUseComplaint.mockReturnValue({
      data: FAKE_COMPLAINT_UNDER_REVIEW,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })
    const user = userEvent.setup()

    renderComplaintDetail()

    const rejectButton = screen.getByRole('button', { name: /Reject Complaint/i })
    await user.click(rejectButton)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Reject Complaint #99/i)).toBeInTheDocument()
  })

  it('calls updateComplaint with status REJECTED and valid rejection reason on modal confirm', async () => {
    mockUseComplaint.mockReturnValue({
      data: FAKE_COMPLAINT_UNDER_REVIEW,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })
    mockMutateAsync.mockResolvedValue({})
    const user = userEvent.setup()

    renderComplaintDetail()

    await user.click(screen.getByRole('button', { name: /Reject Complaint/i }))

    const textarea = screen.getByPlaceholderText(/State the regulatory or evidentiary basis/i)
    await user.type(textarea, 'Investigation found no breach of sanitation standards.')

    const confirmButton = screen.getByRole('button', { name: /Confirm Rejection/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'REJECTED',
          rejection_reason: 'Investigation found no breach of sanitation standards.',
        })
      )
    })
  })

  it('displays the Case Formally Rejected card and locks transitions when complaint is REJECTED', () => {
    mockUseComplaint.mockReturnValue({
      data: FAKE_COMPLAINT_REJECTED,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })

    renderComplaintDetail()

    expect(screen.getByText(/Case Formally Rejected/i)).toBeInTheDocument()
    const reasonMatches = screen.getAllByText(
      /Unverifiable customer statement with no physical sample or receipt provided./i
    )
    expect(reasonMatches.length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByRole('button', { name: /Reject Complaint/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Resolve Case/i })).not.toBeInTheDocument()
  })
})

