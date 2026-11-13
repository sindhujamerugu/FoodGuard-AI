import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RejectComplaintModal } from './RejectComplaintModal'

describe('RejectComplaintModal', () => {
  const defaultProps = {
    isOpen: true,
    complaintId: 101,
    complaintTitle: 'Worm in fried rice',
    isLoading: false,
    apiError: null,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  it('renders modal dialog with complaint details when open', () => {
    render(<RejectComplaintModal {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Reject Complaint #101/i)).toBeInTheDocument()
    expect(screen.getByText(/Worm in fried rice/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/State the regulatory or evidentiary basis/i)).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    render(<RejectComplaintModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('validates mandatory reason and prevents empty submission', async () => {
    const onConfirm = vi.fn()
    render(<RejectComplaintModal {...defaultProps} onConfirm={onConfirm} />)

    const confirmButton = screen.getByRole('button', { name: /Confirm Rejection/i })
    fireEvent.click(confirmButton)

    expect(
      await screen.findByText(/A rejection reason is mandatory/i)
    ).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('validates minimum character length (< 10 chars)', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(<RejectComplaintModal {...defaultProps} onConfirm={onConfirm} />)

    const textarea = screen.getByPlaceholderText(/State the regulatory or evidentiary basis/i)
    await user.type(textarea, 'Too short')

    const confirmButton = screen.getByRole('button', { name: /Confirm Rejection/i })
    await user.click(confirmButton)

    expect(
      await screen.findByText(/Rejection reason must be at least 10 characters long/i)
    ).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('submits valid reason and optional remarks successfully', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<RejectComplaintModal {...defaultProps} onConfirm={onConfirm} />)

    const textarea = screen.getByPlaceholderText(/State the regulatory or evidentiary basis/i)
    await user.type(textarea, 'Unverifiable customer statement with no physical food sample.')

    const confirmButton = screen.getByRole('button', { name: /Confirm Rejection/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        'Unverifiable customer statement with no physical food sample.',
        undefined
      )
    })
  })

  it('displays API error banner when apiError is provided', () => {
    render(
      <RejectComplaintModal
        {...defaultProps}
        apiError="Complaint is not in a status that permits rejection."
      />
    )
    expect(
      screen.getByText('Complaint is not in a status that permits rejection.')
    ).toBeInTheDocument()
  })

  it('disables controls and prevents duplicate submission when isLoading is true', () => {
    const onConfirm = vi.fn()
    render(<RejectComplaintModal {...defaultProps} isLoading={true} onConfirm={onConfirm} />)

    const textarea = screen.getByPlaceholderText(/State the regulatory or evidentiary basis/i)
    expect(textarea).toBeDisabled()

    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    expect(cancelButton).toBeDisabled()
  })

  it('calls onCancel when Cancel button is clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<RejectComplaintModal {...defaultProps} onCancel={onCancel} />)

    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    await user.click(cancelButton)

    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

