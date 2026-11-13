import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Notifications from './Notifications'
import { LanguageProvider } from '@/i18n/LanguageContext'
import { createTestQueryClient } from '@/test/testUtils'
import type { Notification } from '@/types/notification'
import type { User } from '@/types/user'

const mockUseNotifications = vi.fn()
const mockMarkNotificationRead = vi.fn()
const mockMarkAllRead = vi.fn()

const FAKE_CUSTOMER: User = {
  id: 1,
  email: 'customer@foodguard.ai',
  first_name: 'Customer',
  last_name: 'One',
  phone: '',
  role: 'CUSTOMER',
  preferred_language: 'en',
  is_active: true,
  date_joined: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: FAKE_CUSTOMER,
    isLoading: false,
    isAuthenticated: true,
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
    id: 1,
    event_type: 'COMPLAINT_STATUS_CHANGED',
    message: 'Your complaint "Spoiled Milk" has been rejected: Insufficient proof provided.',
    localized_message: 'Your complaint "Spoiled Milk" has been rejected: Insufficient proof provided.',
    message_language: 'en',
    related_report: null,
    related_complaint: 42,
    is_read: false,
    created_at: '2026-02-12T10:00:00Z',
  },
  {
    id: 2,
    event_type: 'REPORT_SUBMITTED',
    message: 'Report submitted successfully.',
    localized_message: 'Report submitted successfully.',
    message_language: 'en',
    related_report: 12,
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
        <MemoryRouter initialEntries={['/notifications']}>
          <Routes>
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/complaints/:id" element={<div>Customer Complaint Detail 42</div>} />
            <Route path="/reports/:id" element={<div>Customer Report Detail 12</div>} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  )
}

describe('Customer Notifications Page (Regression Suite)', () => {
  const markReadMutate = vi.fn()
  const markAllMutate = vi.fn()

  beforeEach(() => {
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

  it('1. renders Customer notifications heading and subtitle', () => {
    renderComponent()
    expect(screen.getByText('Your notifications')).toBeInTheDocument()
    expect(screen.getByText(/stay updated on your reports/i)).toBeInTheDocument()
  })

  it('2. displays rejection notification message with reason to the customer', () => {
    renderComponent()
    expect(
      screen.getByText(/Your complaint "Spoiled Milk" has been rejected: Insufficient proof provided\./i),
    ).toBeInTheDocument()
  })

  it('3. allows filtering between All and Unread', async () => {
    renderComponent()

    expect(screen.getByText(/Report submitted successfully\./i)).toBeInTheDocument()

    const unreadBtn = screen.getByRole('button', { name: /^unread/i })
    await userEvent.click(unreadBtn)

    expect(
      screen.getByText(/Your complaint "Spoiled Milk" has been rejected/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Report submitted successfully\./i)).not.toBeInTheDocument()
  })

  it('4. clicking a complaint notification marks it as read and navigates to customer complaint detail', async () => {
    renderComponent()

    const rejectionCard = screen
      .getByText(/Your complaint "Spoiled Milk" has been rejected/i)
      .closest('button')
    expect(rejectionCard).toBeInTheDocument()

    if (rejectionCard) {
      await userEvent.click(rejectionCard)
      expect(markReadMutate).toHaveBeenCalledWith(1)
      expect(await screen.findByText('Customer Complaint Detail 42')).toBeInTheDocument()
    }
  })

  it('5. triggers markAllRead when customer clicks Mark all as read button', async () => {
    renderComponent()

    const markAllBtn = screen.getByRole('button', { name: /mark all as read/i })
    expect(markAllBtn).toBeInTheDocument()

    await userEvent.click(markAllBtn)
    expect(markAllMutate).toHaveBeenCalled()
  })
})
