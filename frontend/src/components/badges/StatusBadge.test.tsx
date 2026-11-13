import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StatusBadge } from './StatusBadge'

vi.mock('@/i18n/LanguageContext', () => ({
  useTranslation: () => (key: string) => {
    const table: Record<string, string> = {
      'status.draft': 'Draft',
      'status.submitted': 'Submitted',
      'status.underReview': 'Under Review',
      'status.resolved': 'Resolved',
      'status.closed': 'Closed',
      'status.rejected': 'Rejected',
    }
    return table[key] || key
  },
}))

describe('StatusBadge', () => {
  it('renders REJECTED status with danger classes and localized label', () => {
    render(<StatusBadge status="REJECTED" />)
    const badge = screen.getByText('Rejected')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-danger-100')
    expect(badge.className).toContain('text-danger-700')
  })

  it('renders standard statuses correctly', () => {
    const { rerender } = render(<StatusBadge status="UNDER_REVIEW" />)
    expect(screen.getByText('Under Review')).toBeInTheDocument()

    rerender(<StatusBadge status="RESOLVED" />)
    expect(screen.getByText('Resolved')).toBeInTheDocument()
  })
})

