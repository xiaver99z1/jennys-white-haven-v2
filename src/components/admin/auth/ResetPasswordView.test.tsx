import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ResetPasswordView } from './ResetPasswordView'
import { resetPasswordWithToken } from '#/server/auth-actions'

vi.mock('#/server/auth-actions', () => ({
  resetPasswordWithToken: vi.fn(),
}))

describe('ResetPasswordView', () => {
  const originalLocation = window.location
  const mockReplace = vi.fn()
  const mockReplaceState = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        search: '?token=reset-token-123',
        replace: mockReplace,
      },
    })
    vi.spyOn(window.history, 'replaceState').mockImplementation(mockReplaceState)
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
    vi.restoreAllMocks()
  })

  it('shows invalid reset link state when token is missing', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, search: '', replace: mockReplace },
    })

    render(<ResetPasswordView initialToken="   " />)

    expect(
      screen.getByRole('heading', { name: /invalid reset link/i }),
    ).toBeInTheDocument()
    expect(mockReplaceState).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /return to login/i }))
    expect(mockReplace).toHaveBeenCalledWith('/admin/login')
  })

  it('strips token from URL, toggles password visibility, and validates password rules', () => {
    render(<ResetPasswordView initialToken="  reset-token-123  " />)

    expect(mockReplaceState).toHaveBeenCalledWith(null, '', '/reset-password')

    const newPwd = screen.getByLabelText('New Password')
    const confirmPwd = screen.getByLabelText('Confirm New Password')
    expect(newPwd).toHaveAttribute('type', 'password')
    expect(confirmPwd).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(newPwd).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(newPwd).toHaveAttribute('type', 'password')

    fireEvent.click(
      screen.getByRole('button', { name: 'Show confirm password' }),
    )
    expect(confirmPwd).toHaveAttribute('type', 'text')
    fireEvent.click(
      screen.getByRole('button', { name: 'Hide confirm password' }),
    )
    expect(confirmPwd).toHaveAttribute('type', 'password')

    const submitBtn = screen.getByRole('button', { name: /reset password/i })

    // Short password
    fireEvent.change(newPwd, { target: { value: 'Aa1!' } })
    fireEvent.click(submitBtn)
    expect(
      screen.getByText('Password must be between 8 and 128 characters long.'),
    ).toBeInTheDocument()

    // Long password
    fireEvent.change(newPwd, { target: { value: `Aa1!${'x'.repeat(125)}` } })
    fireEvent.click(submitBtn)
    expect(
      screen.getByText('Password must be between 8 and 128 characters long.'),
    ).toBeInTheDocument()

    // Weak password
    fireEvent.change(newPwd, { target: { value: 'NoSpecial123' } })
    fireEvent.click(submitBtn)
    expect(
      screen.getByText(
        'Password must include uppercase, lowercase, a number, and a special character.',
      ),
    ).toBeInTheDocument()

    // Mismatched passwords
    fireEvent.change(newPwd, { target: { value: 'StrongPass!123' } })
    fireEvent.change(confirmPwd, { target: { value: 'OtherPass!123' } })
    fireEvent.click(submitBtn)
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(resetPasswordWithToken).not.toHaveBeenCalled()
  })

  it('resets password successfully and redirects to login on Sign In Now click', async () => {
    vi.mocked(resetPasswordWithToken).mockResolvedValueOnce({
      success: true,
      message: 'Password reset!',
    })

    render(<ResetPasswordView initialToken="reset-token-123" />)

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'NewStrong!123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'NewStrong!123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }))

    await waitFor(() => {
      expect(resetPasswordWithToken).toHaveBeenCalledWith({
        data: {
          token: 'reset-token-123',
          newPassword: 'NewStrong!123',
          confirmPassword: 'NewStrong!123',
        },
      })
      expect(
        screen.getByRole('heading', { name: /password reset complete/i }),
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /sign in now/i }))
    expect(mockReplace).toHaveBeenCalledWith('/admin/login')
  })

  it('displays server Error and fallback message when reset fails', async () => {
    vi.mocked(resetPasswordWithToken).mockRejectedValueOnce(
      new Error('Reset link expired'),
    )

    render(<ResetPasswordView initialToken="reset-token-123" />)

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'NewStrong!123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'NewStrong!123' },
    })

    const submitBtn = screen.getByRole('button', { name: /reset password/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Reset link expired')).toBeInTheDocument()
    })

    vi.mocked(resetPasswordWithToken).mockRejectedValueOnce('unknown')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(
        screen.getByText(
          'This password reset link is invalid or has already been used.',
        ),
      ).toBeInTheDocument()
    })
  })
})
