import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { UserSessionsModal } from './UserSessionsModal'
import { getUserSessions, revokeSession } from '#/server/session-actions'

vi.mock('#/server/session-actions', () => ({
  getUserSessions: vi.fn(),
  revokeSession: vi.fn(),
}))

vi.mock('#/lib/parse-user-agent', () => ({
  parseUserAgent: (ua: string | null) => ua || 'Chrome on Windows',
}))

describe('UserSessionsModal', () => {
  const mockActiveSessions = [
    {
      id: 'session-1',
      token: 'token-abc',
      ipAddress: '192.168.1.5',
      userAgent: 'Mozilla/5.0 Windows',
      createdAt: new Date('2026-10-01T10:00:00Z'),
      expiresAt: new Date('2026-11-01T10:00:00Z'),
    },
    {
      id: 'session-null-meta',
      token: 'token-def',
      ipAddress: null,
      userAgent: null,
      createdAt: new Date('2026-10-01T11:00:00Z'),
      expiresAt: new Date('2026-11-01T11:00:00Z'),
    },
  ]

  const mockSessionHistory = [
    {
      id: 'session-2',
      token: 'token-xyz',
      ipAddress: '192.168.1.8',
      userAgent: 'Mozilla/5.0 Mac',
      createdAt: new Date('2026-09-01T10:00:00Z'),
      expiresAt: new Date('2026-09-05T10:00:00Z'),
    },
    {
      id: 'session-hist-null',
      token: 'token-uvw',
      ipAddress: null,
      userAgent: null,
      createdAt: new Date('2026-09-02T10:00:00Z'),
      expiresAt: new Date('2026-09-06T10:00:00Z'),
    },
  ]

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    userId: 'user-123',
    userName: 'Jane Smith',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when isOpen is false and does not fetch when userId is empty', () => {
    const { container, rerender } = render(
      <UserSessionsModal {...defaultProps} isOpen={false} />,
    )
    expect(container).toBeEmptyDOMElement()

    rerender(<UserSessionsModal {...defaultProps} isOpen={true} userId="" />)
    expect(getUserSessions).not.toHaveBeenCalled()
  })

  it('fetches and displays active sessions and switches between tabs successfully', async () => {
    const user = userEvent.setup()
    vi.mocked(getUserSessions).mockResolvedValueOnce({
      success: true,
      activeSessions: mockActiveSessions,
      sessionHistory: mockSessionHistory,
    } as any)

    render(<UserSessionsModal {...defaultProps} />)

    expect(screen.getByText('User Sessions')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('192.168.1.5')).toBeInTheDocument()
    })

    // Switch to History tab
    const historyTabBtn = screen.getByRole('button', { name: /history/i })
    await user.click(historyTabBtn)

    expect(screen.getByText('192.168.1.8')).toBeInTheDocument()
    expect(screen.getAllByText('Expired / Revoked')[0]).toBeInTheDocument()

    // Switch back to Active tab (covers setActiveTab('active') click handler)
    const activeTabBtn = screen.getByRole('button', { name: /active/i })
    await user.click(activeTabBtn)

    expect(screen.getByText('192.168.1.5')).toBeInTheDocument()

    expect(getUserSessions).toHaveBeenCalledWith({
      data: { userId: 'user-123' },
    })
  })

  it('displays empty state when no active sessions or history exist or when res.success is false', async () => {
    const user = userEvent.setup()
    vi.mocked(getUserSessions).mockResolvedValueOnce({
      success: false,
      activeSessions: [],
      sessionHistory: [],
    })

    const { unmount } = render(<UserSessionsModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('No active sessions found.')).toBeInTheDocument()
    })
    unmount()

    vi.mocked(getUserSessions).mockResolvedValueOnce({
      success: true,
      activeSessions: [],
      sessionHistory: [],
    })

    render(<UserSessionsModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('No active sessions found.')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /history/i }))
    expect(
      screen.getByText('No past session history found.'),
    ).toBeInTheDocument()
  })

  it('revokes an active session successfully and refreshes list, and handles res.success === false on revoke', async () => {
    const user = userEvent.setup()
    vi.mocked(getUserSessions)
      .mockResolvedValueOnce({
        success: true,
        activeSessions: [mockActiveSessions[0]],
        sessionHistory: [],
      } as any)
      .mockResolvedValueOnce({
        success: true,
        activeSessions: [],
        sessionHistory: [],
      })

    vi.mocked(revokeSession)
      .mockResolvedValueOnce({ success: false } as any)
      .mockResolvedValueOnce({ success: true } as any)

    render(<UserSessionsModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Revoke')).toBeInTheDocument()
    })

    const revokeBtn = screen.getByRole('button', { name: 'Revoke' })
    await user.click(revokeBtn)

    expect(revokeSession).toHaveBeenCalledWith({
      data: { token: 'token-abc' },
    })
    expect(getUserSessions).toHaveBeenCalledTimes(1)

    await user.click(revokeBtn)

    await waitFor(() => {
      expect(screen.getByText('No active sessions found.')).toBeInTheDocument()
    })
  })

  it('handles API fetch errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getUserSessions).mockRejectedValueOnce(
      new Error('Failed to fetch'),
    )

    render(<UserSessionsModal {...defaultProps} />)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load user sessions:',
        expect.any(Error),
      )
    })
  })

  it('handles revoke errors gracefully', async () => {
    const user = userEvent.setup()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getUserSessions).mockResolvedValueOnce({
      success: true,
      activeSessions: [mockActiveSessions[0]],
      sessionHistory: [],
    } as any)
    vi.mocked(revokeSession).mockRejectedValueOnce(new Error('Revoke failed'))

    render(<UserSessionsModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Revoke')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Revoke' }))

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to terminate session:',
        expect.any(Error),
      )
    })
  })

  it('triggers onClose when Close button is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(getUserSessions).mockResolvedValueOnce({
      success: true,
      activeSessions: [],
      sessionHistory: [],
    })

    render(<UserSessionsModal {...defaultProps} />)

    const closeBtn = screen.getByRole('button', { name: 'Close' })
    await user.click(closeBtn)

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })
})
