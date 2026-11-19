import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AdminSetupForm } from './AdminSetupForm'
import { resendVerificationByEmail } from '#/server/auth-actions'
import { createInitialSuperAdmin } from '#/server/setup-actions'

vi.mock('#/server/auth-actions', () => ({
  resendVerificationByEmail: vi.fn(),
}))

vi.mock('#/server/setup-actions', () => ({
  createInitialSuperAdmin: vi.fn(),
}))

describe('AdminSetupForm', () => {
  const originalLocation = window.location
  const mockReplace = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, replace: mockReplace },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  const fillValidForm = () => {
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: '  Jenny Admin  ' },
    })
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: '  Admin@JennysWhiteHaven.com  ' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'SuperAdmin!123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'SuperAdmin!123' },
    })
  }

  it('renders setup heading, inputs, and toggles visibility for both password fields', () => {
    render(<AdminSetupForm />)

    expect(screen.getByAltText("Jenny's White Haven")).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /create super admin account/i }),
    ).toBeInTheDocument()

    const pwdInput = screen.getByLabelText('Password')
    const confirmInput = screen.getByLabelText('Confirm Password')
    expect(pwdInput).toHaveAttribute('type', 'password')
    expect(confirmInput).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(pwdInput).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(pwdInput).toHaveAttribute('type', 'password')

    fireEvent.click(
      screen.getByRole('button', { name: 'Show confirm password' }),
    )
    expect(confirmInput).toHaveAttribute('type', 'text')
    fireEvent.click(
      screen.getByRole('button', { name: 'Hide confirm password' }),
    )
    expect(confirmInput).toHaveAttribute('type', 'password')
  })

  it('validates name, email, password strength, and confirmation before submitting', () => {
    render(<AdminSetupForm />)
    const submitBtn = screen.getByRole('button', {
      name: /create super admin/i,
    })

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'A' },
    })
    fireEvent.click(submitBtn)
    expect(
      screen.getByText('Full name must be between 2 and 100 characters.'),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'A'.repeat(101) },
    })
    fireEvent.click(submitBtn)
    expect(
      screen.getByText('Full name must be between 2 and 100 characters.'),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Jenny Admin' },
    })
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'not-an-email' },
    })
    fireEvent.click(submitBtn)
    expect(
      screen.getByText('Please enter a valid email address.'),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'admin@jennyswhitehaven.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Aa1!' },
    })
    fireEvent.click(submitBtn)
    expect(
      screen.getByText('Password must be between 8 and 128 characters long.'),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: `Aa1!${'x'.repeat(125)}` },
    })
    fireEvent.click(submitBtn)
    expect(
      screen.getByText('Password must be between 8 and 128 characters long.'),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'WeakPass1234' },
    })
    fireEvent.click(submitBtn)
    expect(
      screen.getByText(
        'Password must include uppercase, lowercase, a number, and a special character.',
      ),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'StrongPass!123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'DifferentPass!123' },
    })
    fireEvent.click(submitBtn)
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(createInitialSuperAdmin).not.toHaveBeenCalled()
  })

  it('shows Verify Your Email screen after setup, counts down cooldown, supports resend and Go to Sign In', async () => {
    vi.useFakeTimers()

    vi.mocked(createInitialSuperAdmin).mockResolvedValueOnce({
      success: true,
      requiresVerification: true,
      message: 'Check email',
      user: {
        id: 'super-1',
        name: 'Jenny Admin',
        email: 'admin@jennyswhitehaven.com',
        role: 'super_admin',
      },
    })

    render(<AdminSetupForm />)
    fillValidForm()

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /create super admin/i }),
      )
    })

    expect(
      screen.getByRole('heading', { name: /verify your email/i }),
    ).toBeInTheDocument()

    expect(createInitialSuperAdmin).toHaveBeenCalledWith({
      data: {
        name: 'Jenny Admin',
        email: 'admin@jennyswhitehaven.com',
        password: 'SuperAdmin!123',
        confirmPassword: 'SuperAdmin!123',
      },
    })
    expect(screen.getByText('admin@jennyswhitehaven.com')).toBeInTheDocument()

    // Resend button disabled during 60s cooldown
    const cooldownBtn = screen.getByRole('button', {
      name: /resend email in 60s/i,
    })
    expect(cooldownBtn).toBeDisabled()

    // Advance 60 seconds so cooldown finishes
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })

    const resendBtn = screen.getByRole('button', {
      name: /resend verification email/i,
    })
    expect(resendBtn).not.toBeDisabled()

    // 1. Successful resend
    vi.mocked(resendVerificationByEmail).mockResolvedValueOnce({
      success: true,
      message: 'A fresh verification link has been sent.',
    })
    await act(async () => {
      fireEvent.click(resendBtn)
    })

    expect(resendVerificationByEmail).toHaveBeenCalledWith({
      data: { email: 'admin@jennyswhitehaven.com' },
    })
    expect(
      screen.getByText('A fresh verification link has been sent.'),
    ).toBeInTheDocument()

    // Advance cooldown again for error branch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })

    // 2. Resend failure with Error
    vi.mocked(resendVerificationByEmail).mockRejectedValueOnce(
      new Error('Too many requests'),
    )
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /resend verification email/i }),
      )
    })

    expect(screen.getByText('Too many requests')).toBeInTheDocument()

    // 3. Resend failure with non-Error fallback
    vi.mocked(resendVerificationByEmail).mockRejectedValueOnce('unknown')
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /resend verification email/i }),
      )
    })

    expect(
      screen.getByText(
        'Failed to resend verification email. Please try again.',
      ),
    ).toBeInTheDocument()

    // Go to Sign In button
    fireEvent.click(screen.getByRole('button', { name: /go to sign in/i }))
    expect(mockReplace).toHaveBeenCalledWith('/admin/login')
  })

  it('displays server error message and fallback error message on setup failure', async () => {
    vi.mocked(createInitialSuperAdmin).mockRejectedValueOnce(
      new Error('Initial setup has already been completed.'),
    )

    render(<AdminSetupForm />)
    fillValidForm()

    const submitBtn = screen.getByRole('button', {
      name: /create super admin/i,
    })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(
        screen.getByText('Initial setup has already been completed.'),
      ).toBeInTheDocument()
    })

    vi.mocked(createInitialSuperAdmin).mockRejectedValueOnce('unexpected')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(
        screen.getByText(
          'Failed to complete initial setup. Please try again.',
        ),
      ).toBeInTheDocument()
    })
  })
})
