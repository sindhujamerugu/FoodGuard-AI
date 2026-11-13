import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReviewerNotifications from './ReviewerNotifications'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { LanguageProvider } from '@/i18n/LanguageContext'
import { createTestQueryClient } from '@/test/testUtils'
import type { Notification } from '@/types/notification'
import type { User } from '@/types/user'

const mockUseNotifications = vi.fn()
const mockMarkNotificationRead = vi.fn()
const mockMarkAllRead = vi.fn()

const FAKE_REVIEWER: User = {
  id: 4,
  email: 'reviewer@foodguard.ai',
  first_name: 'Reviewer',
  last_name: 'Staff',
  phone: '',
  role: 'REVIEWER',
  preferred_language: 'en',
  is_active: true,
  date_joined: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const FAKE_CUSTOMER: User = {
  id: 1,
  email: 'customer@example.com',
  first_name: 'Customer',
  last_name: 'User',
  phone: '',
  role: 'CUSTOMER',
  preferred_language: 'en',
  is_active: true,
  date_joined: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

let currentUser: User | null = FAKE_REVIEWER

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: currentUser,
    isLoading: false,
    isAuthenticated: Boolean(currentUser),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => mockUseNotifications(),
  useMarkNotificationRead: () => mockMarkNotificationRead(),
  useMarkAllRead: () => mockMarkAllRead(),
}))

const FAKE_NOTIFICATIONS: Notification[] = [
  {
    id: 101,
    event_type: 'COMPLAINT_SUBMITTED',
    message: 'New complaint filed: Spoiled Biryani.',
    localized_message: 'New complaint filed: Spoiled Biryani.',
    message_language: 'en',
    related_report: null,
    related_complaint: 55,
    is_read: false,
    created_at: '2026-02-12T10:00:00Z',
  },
  {
    id: 102,
    event_type: 'ESCALATION_CREATED',
    message: 'Escalation created for complaint #55.',
    localized_message: 'Escalation created for complaint #55.',
    message_language: 'en',
    related_report: null,
    related_complaint: 55,
    is_read: false,
    created_at: '2026-02-12T11:00:00Z',
  },
  {
    id: 103,
    event_type: 'REPORT_SUBMITTED',
    message: 'New food safety report submitted: Hygiene concern.',
    localized_message: 'New food safety report submitted: Hygiene concern.',
    message_language: 'en',
    related_report: 88,
    related_complaint: null,
    is_read: true,
    created_at: '2026-02-11T09:00:00Z',
  },
]

function renderComponent() {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <MemoryRouter initialEntries={['/reviewer/notifications']}>
          <Routes>
            <Route path="/reviewer/notifications" element={<ReviewerNotifications />} />
            <Route path="/reviewer/complaints/:id" element={<div>Complaint Detail Page</div>} />
            <Route path="/reviewer/reports/:id" element={<div>Report Detail Page</div>} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  )
}

describe('ReviewerNotifications Page', () => {
  const markReadMutate = vi.fn()
  const markAllMutate = vi.fn()

  beforeEach(() => {
    currentUser = FAKE_REVIEWER
    mockMarkNotificationRead.mockReturnValue({
      mutate: markReadMutate,
      isPending: false,
    })
    mockMarkAllRead.mockReturnValue({
      mutate: markAllMutate,
      isPending: false,
    })
    mockUseNotifications.mockReturnValue({
      data: FAKE_NOTIFICATIONS,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })
    vi.clearAllMocks()
  })

  it('1. renders header, unread badge, and summary cards correctly', () => {
    renderComponent()

    expect(screen.getAllByRole('heading', { level: 1, name: /notifications/i }).length).toBeGreaterThanOrEqual(1)
    // Unread count badge: 2 unread
    expect(screen.getByText(/2 unread/i)).toBeInTheDocument()

    // KPI cards: Total=3, Unread=2, Read=1, Action Required=2
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1)
  })

  it('2. renders all notification cards with proper event badges and messages', () => {
    renderComponent()

    expect(screen.getByText(/New complaint filed: Spoiled Biryani\./i)).toBeInTheDocument()
    expect(screen.getByText(/Escalation created for complaint #55\./i)).toBeInTheDocument()
    expect(screen.getByText(/New food safety report submitted: Hygiene concern\./i)).toBeInTheDocument()
    expect(screen.getAllByText('Case #55').length).toBe(2)
    expect(screen.getByText('Report #88')).toBeInTheDocument()
  })

  it('3. shows loading skeleton while notifications are fetching', () => {
    mockUseNotifications.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    })

    renderComponent()
    // Skeletons are rendered
    expect(document.querySelector('.animate-skeleton')).toBeInTheDocument()
  })

  it('4. shows error state with working retry when request fails', async () => {
    const refetchMock = vi.fn()
    mockUseNotifications.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: refetchMock,
    })

    renderComponent()

    expect(screen.getAllByText(/we couldn't load your notifications/i).length).toBeGreaterThanOrEqual(1)
    const retryBtn = screen.getByRole('button', { name: /try again|retry/i })
    expect(retryBtn).toBeInTheDocument()
    await userEvent.click(retryBtn)
    expect(refetchMock).toHaveBeenCalled()
  })

  it('5. shows empty state when there are zero notifications', () => {
    mockUseNotifications.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })

    renderComponent()
    expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument()
  })

  it('6. filters notifications by Unread tab', async () => {
    renderComponent()

    // Initially all 3 are displayed
    expect(screen.getByText(/New food safety report submitted/i)).toBeInTheDocument()

    // Click Unread tab
    const unreadTab = screen.getByRole('tab', { name: /unread/i })
    await userEvent.click(unreadTab)

    // Unread items remain
    expect(screen.getByText(/New complaint filed: Spoiled Biryani\./i)).toBeInTheDocument()
    expect(screen.getByText(/Escalation created for complaint #55\./i)).toBeInTheDocument()
    // Read item is filtered out
    expect(screen.queryByText(/New food safety report submitted/i)).not.toBeInTheDocument()
  })

  it('7. filters notifications by Read tab', async () => {
    renderComponent()

    const readTab = screen.getByRole('tab', { name: /^read/i })
    await userEvent.click(readTab)

    expect(screen.getByText(/New food safety report submitted/i)).toBeInTheDocument()
    expect(screen.queryByText(/New complaint filed: Spoiled Biryani\./i)).not.toBeInTheDocument()
  })

  it('8. filters notifications by Complaints tab', async () => {
    renderComponent()

    const complaintsTab = screen.getByRole('tab', { name: /complaints/i })
    await userEvent.click(complaintsTab)

    expect(screen.getByText(/New complaint filed: Spoiled Biryani\./i)).toBeInTheDocument()
    expect(screen.queryByText(/New food safety report submitted/i)).not.toBeInTheDocument()
  })

  it('9. marks individual notification as read when check button is clicked', async () => {
    renderComponent()

    const markReadButtons = screen.getAllByTitle(/mark as read/i)
    expect(markReadButtons.length).toBeGreaterThanOrEqual(1)

    await userEvent.click(markReadButtons[0])
    expect(markReadMutate).toHaveBeenCalledWith(101)
  })

  it('10. marks all notifications as read when bulk button is clicked', async () => {
    renderComponent()

    const markAllBtn = screen.getByRole('button', { name: /mark all as read/i })
    expect(markAllBtn).toBeInTheDocument()

    await userEvent.click(markAllBtn)
    expect(markAllMutate).toHaveBeenCalled()
  })

  it('11. navigates to related complaint when card is clicked', async () => {
    renderComponent()

    const complaintCard = screen.getByText(/New complaint filed: Spoiled Biryani\./i).closest('[role="article"]')
    expect(complaintCard).toBeInTheDocument()

    if (complaintCard) {
      await userEvent.click(complaintCard)
      expect(await screen.findByText('Complaint Detail Page')).toBeInTheDocument()
    }
  })

  it('12. protects /reviewer/notifications against CUSTOMER access', () => {
    currentUser = FAKE_CUSTOMER
    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/reviewer/notifications']}>
          <Routes>
            <Route
              path="/reviewer/notifications"
              element={
                <RoleGuard allow={['REVIEWER', 'ADMIN']}>
                  <ReviewerNotifications />
                </RoleGuard>
              }
            />
            <Route path="/dashboard" element={<div>Customer Dashboard Redirected</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByText('Customer Dashboard Redirected')).toBeInTheDocument()
    expect(screen.queryByText(/reviewer subtitle/i)).not.toBeInTheDocument()
  })
})
