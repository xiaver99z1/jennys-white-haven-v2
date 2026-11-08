import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ResendVerificationModal } from './ResendVerificationModal'
import { resendVerificationEmail } from '#/server/admin-actions'

vi.mock('#/server/admin-actions', () => ({
  resendVerificationEmail: vi.fn(),
}))

describe('ResendVerificationModal', () => {
  const mockUser = {
    id: 'user-789',
    name: 'Jane Smith',
    email: 'jane@jennyswhitehaven.com',
    activationEmailCount: 1,
    lastActivationEmailSentAt: new Date().toISOString(),
  }

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    user: mockUser,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ResendVerificationModal {...defaultProps} isOpen={false} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when user prop is null', () => {
    const { container } = render(
      <ResendVerificationModal {...defaultProps} user={null} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders modal details, user email, and daily usage banner', () => {
    render(<ResendVerificationModal {...defaultProps} />)

    expect(
      screen.getByRole('heading', { name: /resend verification email/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('jane@jennyswhitehaven.com')).toBeInTheDocument()
    expect(screen.getByText(/daily usage:/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /send email/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('disables send button and displays max limit warning when daily limit is reached', () => {
    const maxedUser = {
      ...mockUser,
      activationEmailCount: 3,
      lastActivationEmailSentAt: new Date().toISOString(),
    }

    render(<ResendVerificationModal {...defaultProps} user={maxedUser} />)

    expect(screen.getByText(/maximum daily limit reached/i)).toBeInTheDocument()

    const sendBtn = screen.getByRole('button', { name: /send email/i })
    expect(sendBtn).toBeDisabled()
  })

  it('executes successful verification email resend and auto-closes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    vi.mocked(resendVerificationEmail).mockResolvedValueOnce({
      success: true,
      message: 'Verification email resent successfully!',
    } as any)

    render(<ResendVerificationModal {...defaultProps} />)

    const sendBtn = screen.getByRole('button', { name: /send email/i })
    await user.click(sendBtn)

    expect(resendVerificationEmail).toHaveBeenCalledWith({
      data: { userId: 'user-789' },
    })

    await waitFor(() => {
      expect(
        screen.getByText('Verification email resent successfully!'),
      ).toBeInTheDocument()
    })

    expect(defaultProps.onSuccess).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1200)
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('handles verification email resend failure with custom error message', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    vi.mocked(resendVerificationEmail).mockRejectedValueOnce(
      new Error('SMTP server error'),
    )

    render(<ResendVerificationModal {...defaultProps} />)

    const sendBtn = screen.getByRole('button', { name: /send email/i })
    await user.click(sendBtn)

    await waitFor(() => {
      expect(screen.getByText('SMTP server error')).toBeInTheDocument()
    })

    expect(defaultProps.onSuccess).not.toHaveBeenCalled()
    expect(defaultProps.onClose).not.toHaveBeenCalled()
  })

  it('handles verification email resend failure with fallback error message', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    vi.mocked(resendVerificationEmail).mockRejectedValueOnce({})

    render(<ResendVerificationModal {...defaultProps} />)

    const sendBtn = screen.getByRole('button', { name: /send email/i })
    await user.click(sendBtn)

    await waitFor(() => {
      expect(screen.getByText('Failed to send email.')).toBeInTheDocument()
    })
  })

  it('triggers onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<ResendVerificationModal {...defaultProps} />)

    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelBtn)

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })
})
