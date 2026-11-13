import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { ComplaintTimeline } from './ComplaintTimeline'
import { LanguageProvider } from '@/i18n/LanguageContext'
import { createTestQueryClient } from '@/test/testUtils'
import type { Complaint } from '@/types/complaint'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'customer@example.com', role: 'CUSTOMER', preferred_language: 'en' },
    isAuthenticated: true,
  }),
}))

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({ data: [], isLoading: false }),
}))

vi.mock('@/hooks/useOfficerAssignment', () => ({
  useEscalationEvents: () => ({ data: [], isLoading: false }),
}))

const FAKE_BASE_COMPLAINT: Complaint = {
  id: 42,
  food_report: { id: 7, title: 'Unsanitary conditions', status: 'SUBMITTED' },
  customer: { id: 1, email: 'customer@example.com', first_name: 'Asha', last_name: 'Verma', preferred_language: 'en' },
  restaurant: { id: 3, name: 'Spice Route', city: 'Mumbai', state: 'Maharashtra' },
  title: 'Foreign matter found in dish',
  description: 'Found hair and metal piece in soup.',
  category: 'FOREIGN_OBJECT',
  original_language: 'en',
  status: 'UNDER_REVIEW',
  priority: 'HIGH',
  resolution_notes: '',
  submitted_at: '2026-02-01T10:00:00Z',
  updated_at: '2026-02-01T11:00:00Z',
  resolved_at: null,
}

function renderTimeline(complaint: Complaint) {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ComplaintTimeline complaint={complaint} />
      </LanguageProvider>
    </QueryClientProvider>,
  )
}

describe('ComplaintTimeline', () => {
  it('renders REJECTED status with rejection reason and without Resolved or Closed milestones', () => {
    const rejectedComplaint: Complaint = {
      ...FAKE_BASE_COMPLAINT,
      status: 'REJECTED',
      rejection_reason: 'Insufficient photographic proof to substantiate claim.',
      rejected_at: '2026-02-01T14:30:00Z',
    }

    renderTimeline(rejectedComplaint)

    expect(screen.getByText(/Rejected/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Insufficient photographic proof to substantiate claim./i)
    ).toBeInTheDocument()
    expect(screen.getByText(/Submitted/i)).toBeInTheDocument()
    expect(screen.getByText(/Under Review/i)).toBeInTheDocument()
    expect(screen.queryByText(/Resolved/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Closed/i)).not.toBeInTheDocument()
  })

  it('renders RESOLVED progression without Rejected milestone', () => {
    const resolvedComplaint: Complaint = {
      ...FAKE_BASE_COMPLAINT,
      status: 'RESOLVED',
      resolved_at: '2026-02-02T16:00:00Z',
      resolution_notes: 'Kitchen inspected and corrective measures taken.',
    }

    renderTimeline(resolvedComplaint)

    expect(screen.getByText(/Resolved/i)).toBeInTheDocument()
    expect(screen.queryByText(/Rejected/i)).not.toBeInTheDocument()
  })
})
