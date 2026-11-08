import '@testing-library/jest-dom/vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AdminLoginForm } from './AdminLoginForm'
import { authClient } from '#/lib/auth-client'
import { logUserLogin } from '#/server/auth-actions'

vi.mock('#/lib/auth-client', () => ({
  authClient: {
    signIn: {
      email: vi.fn(),
    },
  },
}))

vi.mock('#/server/auth-actions', () => ({
  logUserLogin: vi.fn(),
}))

describe('AdminLoginForm', () => {
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
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  it('renders logo, email/password inputs, and toggles password visibility', () => {
    render(<AdminLoginForm />)

    expect(screen.getByAltText("Jenny's White Haven")).toBeInTheDocument()
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText('Password')

    expect(emailInput).toBeInTheDocument()
    expect(passwordInput).toHaveAttribute('type', 'password')

    // Toggle show password
    const toggleBtn = screen.getByRole('button', { name: /show password/i })
    fireEvent.click(toggleBtn)
    expect(passwordInput).toHaveAttribute('type', 'text')

    // Toggle hide password
    const hideBtn = screen.getByRole('button', { name: /hide password/i })
    fireEvent.click(hideBtn)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('successfully signs in, logs user login activity, and redirects to /admin', async () => {
    vi.mocked(authClient.signIn.email).mockResolvedValueOnce({
      data: { user: { id: 'admin-1' } },
      error: null,
    } as any)
    vi.mocked(logUserLogin).mockResolvedValueOnce(undefined as any)

    render(<AdminLoginForm />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: '  admin@resort.com  ' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Password!123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(authClient.signIn.email).toHaveBeenCalledWith({
        email: 'admin@resort.com',
        password: 'Password!123',
      })
      expect(logUserLogin).toHaveBeenCalledTimes(1)
      expect(mockReplace).toHaveBeenCalledWith('/admin')
    })
  })

  it('displays verification error when error.code is EMAIL_NOT_VERIFIED or message mentions verify', async () => {
    render(<AdminLoginForm />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'unverified@resort.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Password!123' },
    })

    // 1. Trigger via error.code === 'EMAIL_NOT_VERIFIED'
    vi.mocked(authClient.signIn.email).mockResolvedValueOnce({
      error: { code: 'EMAIL_NOT_VERIFIED', message: 'Not active' },
    } as any)

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(
        screen.getByText(
          'Please check your email and activate your account before logging in.',
        ),
      ).toBeInTheDocument()
    })

    // 2. Trigger via error.message containing 'verify'
    vi.mocked(authClient.signIn.email).mockResolvedValueOnce({
      error: { code: 'OTHER_CODE', message: 'Please verify your email first' },
    } as any)

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(
        screen.getByText(
          'Please check your email and activate your account before logging in.',
        ),
      ).toBeInTheDocument()
    })
  })

  it('displays custom error message and falls back to default message when error.message is empty', async () => {
    render(<AdminLoginForm />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'admin@resort.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrongpass' },
    })

    // 1. Custom error message
    vi.mocked(authClient.signIn.email).mockResolvedValueOnce({
      error: { code: 'INVALID_CREDENTIALS', message: 'Account is locked' },
    } as any)

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Account is locked')).toBeInTheDocument()
    })

    // 2. Fallback error message when message is undefined/empty
    vi.mocked(authClient.signIn.email).mockResolvedValueOnce({
      error: { code: 'UNKNOWN' },
    } as any)

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument()
    })
  })

  it('handles unexpected thrown exceptions in the catch block', async () => {
    vi.mocked(authClient.signIn.email).mockRejectedValueOnce(
      new Error('Network failure'),
    )

    render(<AdminLoginForm />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'admin@resort.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'Password!123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Something went wrong. Please try again.'),
      ).toBeInTheDocument()
    })
  })
})
