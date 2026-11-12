import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ConfirmModal } from '#/components/common/ConfirmModal'

describe('ConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Are you sure?',
    description: 'This action cannot be undone.',
    onConfirm: vi.fn(),
    onClose: vi.fn(),
  }

  it('does not render when isOpen is false', () => {
    render(<ConfirmModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument()
  })

  it('renders success variant correctly', () => {
    render(<ConfirmModal {...defaultProps} variant="success" />)
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveClass(
      'bg-emerald-600',
    )
  })

  it('renders danger variant correctly', () => {
    render(<ConfirmModal {...defaultProps} variant="danger" />)
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveClass(
      'bg-rose-600',
    )
  })

  it('renders amber variant correctly', () => {
    render(<ConfirmModal {...defaultProps} variant="amber" />)
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveClass(
      'bg-amber-700',
    )
  })

  it('handles confirm and close button clicks', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onClose = vi.fn()

    render(
      <ConfirmModal
        {...defaultProps}
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disables buttons and shows loading state when isLoading is true', () => {
    render(<ConfirmModal {...defaultProps} isLoading={true} />)

    const confirmBtn = screen.getByRole('button', { name: 'Processing...' })
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' })

    expect(confirmBtn).toBeDisabled()
    expect(cancelBtn).toBeDisabled()
  })
})
