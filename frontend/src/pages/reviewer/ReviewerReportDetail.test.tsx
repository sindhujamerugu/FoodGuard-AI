import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import ReviewerReportDetail from './ReviewerReportDetail'
import { LanguageProvider } from '@/i18n/LanguageContext'
import { createTestQueryClient } from '@/test/testUtils'
import type { FoodReport } from '@/types/report'
import type { AIAnalysis } from '@/types/aiAnalysis'

const mockUseReport = vi.fn()
const mockUseAIAnalysis = vi.fn()
const mockUseRunAIAnalysis = vi.fn()
const mockUseComplaints = vi.fn()
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

vi.mock('@/hooks/useReports', () => ({
  useReport: () => mockUseReport(),
}))

vi.mock('@/hooks/useAIAnalysis', () => ({
  useAIAnalysis: () => mockUseAIAnalysis(),
  useRunAIAnalysis: () => mockUseRunAIAnalysis(),
}))

vi.mock('@/hooks/useComplaints', () => ({
  useComplaints: () => mockUseComplaints(),
  useUpdateComplaint: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/hooks/useEscalations', () => ({
  useEscalations: () => mockUseEscalations(),
  useCreateEscalation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

const FAKE_REPORT: FoodReport = {
  id: 42,
  customer: { id: 10, email: 'john@example.com', first_name: 'John', last_name: 'Doe' },
  restaurant: { id: 101, name: 'Spice Route', city: 'Mumbai', state: 'Maharashtra' },
  title: 'Discolored Chicken Gravy',
  description: 'The chicken had an unusual green tint and foul odor.',
  image: 'https://example.com/evidence.jpg',
  status: 'SUBMITTED',
  priority: 'HIGH',
  created_at: '2026-02-10T14:30:00Z',
  updated_at: '2026-02-10T14:30:00Z',
}

const FAKE_AI: AIAnalysis = {
  id: 88,
  food_report: 42,
  status: 'COMPLETED',
  risk: 'HIGH',
  confidence: '0.880',
  concerns: ['DISCOLORATION', 'POSSIBLE_SPOILAGE'],
  message: 'Visual markers indicate abnormal surface coloration.',
  analyzed_at: '2026-02-10T14:35:00Z',
  model_name: 'foodguard-vision-ensemble',
  model_version: '1.2.0',
  created_at: '2026-02-10T14:35:00Z',
  updated_at: '2026-02-10T14:35:00Z',
}

function renderReportDetail() {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/reviewer/reports/42']}>
        <LanguageProvider>
          <Routes>
            <Route path="/reviewer/reports/:id" element={<ReviewerReportDetail />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ReviewerReportDetail — Two-Column Case Workspace', () => {
  it('renders Case Details on the left and AI Visual Assessment on the right', () => {
    mockUseReport.mockReturnValue({ data: FAKE_REPORT, isLoading: false, isError: false })
    mockUseAIAnalysis.mockReturnValue({ data: FAKE_AI, isLoading: false, isError: false })
    mockUseRunAIAnalysis.mockReturnValue({ mutate: vi.fn(), isPending: false })
    mockUseComplaints.mockReturnValue({ data: [], isLoading: false, isError: false })
    mockUseEscalations.mockReturnValue({ data: [], isLoading: false, isError: false })

    renderReportDetail()

    // Header & reference
    expect(screen.getAllByText(/REP-42/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Discolored Chicken Gravy')).toBeInTheDocument()

    // Case Details (Left column)
    expect(screen.getByText('Case Details')).toBeInTheDocument()
    expect(screen.getByText('Spice Route (Mumbai)')).toBeInTheDocument()
    expect(screen.getByText(/The chicken had an unusual green tint/i)).toBeInTheDocument()

    // AI Visual Assessment (Right column)
    expect(screen.getByText('Preliminary Visual Assessment')).toBeInTheDocument()
    expect(screen.getByText(/High Visible Concern/i)).toBeInTheDocument()
    expect(screen.getAllByText('88%').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/foodguard-vision-ensemble/i)).toBeInTheDocument()

    // Non-proof / Preliminary Disclaimer
    expect(
      screen.getByText(/preliminary algorithmic visual screening/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/certified laboratory analysis or legal proof/i),
    ).toBeInTheDocument()

    // Audit Timeline
    expect(screen.getByText('Audit & Case Timeline')).toBeInTheDocument()
  })

  it('renders linked complaint and Reviewer Action transitions when complaint exists', () => {
    const fakeComplaint = {
      id: 99,
      food_report: { id: 42, title: 'Discolored Chicken Gravy', status: 'SUBMITTED' },
      customer: FAKE_REPORT.customer,
      restaurant: FAKE_REPORT.restaurant,
      title: 'Formal Complaint for Food Poisoning',
      description: 'Severe stomach cramps following consumption.',
      category: 'SPOILAGE' as const,
      original_language: 'en' as const,
      status: 'SUBMITTED' as const,
      priority: 'HIGH' as const,
      resolution_notes: '',
      submitted_at: '2026-02-10T15:00:00Z',
      updated_at: '2026-02-10T15:00:00Z',
      resolved_at: null,
    }

    mockUseReport.mockReturnValue({ data: FAKE_REPORT, isLoading: false, isError: false })
    mockUseAIAnalysis.mockReturnValue({ data: FAKE_AI, isLoading: false, isError: false })
    mockUseRunAIAnalysis.mockReturnValue({ mutate: vi.fn(), isPending: false })
    mockUseComplaints.mockReturnValue({ data: [fakeComplaint], isLoading: false, isError: false })
    mockUseEscalations.mockReturnValue({ data: [], isLoading: false, isError: false })

    renderReportDetail()

    expect(screen.getByText('Linked Customer Complaint')).toBeInTheDocument()
    expect(screen.getByText('Formal Complaint for Food Poisoning')).toBeInTheDocument()
    expect(screen.getByText('Reviewer Action')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /move to under review/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /escalate/i })).toBeInTheDocument()
  })
})
