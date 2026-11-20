import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { VerifyActivationView } from './VerifyActivationView'
import { verifyActivationToken } from '#/server/auth-actions'

vi.mock('#/server/auth-actions', () => ({
  verifyActivationToken: vi.fn(),
}))

describe('VerifyActivationView', () => {
  const originalLocation = window.location
  const mockReplace = vi.fn()
  const mockReplaceState = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        search: '?token=secret-token',
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

  it('shows invalid link immediately when token is missing', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, search: '', replace: mockReplace },
    })

    render(<VerifyActivationView initialToken="" />)

    expect(
      screen.getByRole('heading', { name: /invalid link/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Verification token is missing.'),
    ).toBeInTheDocument()
    expect(mockReplaceState).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /return to login/i }))
    expect(mockReplace).toHaveBeenCalledWith('/admin/login')
  })

  it('strips token from URL on mount and verifies only after explicit user click', async () => {
    vi.mocked(verifyActivationToken).mockResolvedValueOnce({
      success: true,
      message: 'Email verified successfully!',
    })

    render(<VerifyActivationView initialToken="  secret-token  " />)

    // Token stripped from address bar on mount; NOT auto-consumed before click
    expect(mockReplaceState).toHaveBeenCalledWith(
      null,
      '',
      '/verify-activation',
    )
    expect(verifyActivationToken).not.toHaveBeenCalled()
    expect(
      screen.getByRole('heading', { name: /activate your account/i }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: /verify & activate account/i }),
    )

    await waitFor(() => {
      expect(verifyActivationToken).toHaveBeenCalledWith({
        data: { token: 'secret-token' },
      })
      expect(
        screen.getByRole('heading', { name: /email verified!/i }),
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /sign in now/i }))
    expect(mockReplace).toHaveBeenCalledWith('/admin/login')
  })

  it('displays error message when verification fails with Error or fallback', async () => {
    vi.mocked(verifyActivationToken).mockRejectedValueOnce(
      new Error('Token expired'),
    )

    const { unmount } = render(
      <VerifyActivationView initialToken="expired-token" />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: /verify & activate account/i }),
    )

    await waitFor(() => {
      expect(screen.getByText('Token expired')).toBeInTheDocument()
    })

    unmount()

    vi.mocked(verifyActivationToken).mockRejectedValueOnce('unknown error')
    render(<VerifyActivationView initialToken="bad-token" />)

    fireEvent.click(
      screen.getByRole('button', { name: /verify & activate account/i }),
    )

    await waitFor(() => {
      expect(
        screen.getByText(
          'This activation link is invalid or has already been consumed.',
        ),
      ).toBeInTheDocument()
    })
  })
})
