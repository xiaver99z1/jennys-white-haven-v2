import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { UserActionsDropdown } from './UserActionsDropdown'
import { blockAdminUser, unblockAdminUser } from '#/server/admin-actions'

vi.mock('#/server/admin-actions', () => ({
  blockAdminUser: vi.fn(),
  unblockAdminUser: vi.fn(),
}))

vi.mock('#/components/admin/users/UserSessionsModal', () => ({
  UserSessionsModal: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div>
        <span data-testid="sessions-modal">Sessions Modal</span>
        <button onClick={onClose}>Close Sessions</button>
      </div>
    ) : null,
}))

vi.mock('#/components/admin/users/UserActivityLogsModal', () => ({
  UserActivityLogsModal: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div>
        <span data-testid="activity-modal">Activity Modal</span>
        <button onClick={onClose}>Close Activity</button>
      </div>
    ) : null,
}))

describe('UserActionsDropdown', () => {
  const mockUserActive = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    emailVerified: false,
    banned: false,
  }

  const mockUserBanned = {
    id: 'user-2',
    name: 'Jane Doe',
    email: 'jane@example.com',
    emailVerified: true,
    banned: true,
  }

  const defaultProps = {
    user: mockUserActive,
    onEdit: vi.fn(),
    onResendVerification: vi.fn(),
    onOpen: vi.fn(),
    onSuccess: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('toggles dropdown menu open and closed and calls onOpen only when opened', async () => {
    const user = userEvent.setup()
    render(<UserActionsDropdown {...defaultProps} />)

    const triggerBtn = screen.getByRole('button', { name: /user actions/i })
    await user.click(triggerBtn)

    expect(defaultProps.onOpen).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Edit Profile')).toBeInTheDocument()
    expect(screen.getByText('Resend Email Verification')).toBeInTheDocument()

    await user.click(triggerBtn)
    expect(defaultProps.onOpen).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument()
  })

  it('closes dropdown menu when backdrop is clicked', async () => {
    const user = userEvent.setup()
    const { container } = render(<UserActionsDropdown {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /user actions/i }))
    expect(screen.getByText('Edit Profile')).toBeInTheDocument()

    const backdrop = container.querySelector('.fixed.inset-0.z-10')!
    await user.click(backdrop)

    expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument()
  })

  it('triggers onEdit callback when Edit Profile is clicked', async () => {
    const user = userEvent.setup()
    render(<UserActionsDropdown {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /user actions/i }))
    await user.click(screen.getByText('Edit Profile'))

    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockUserActive)
  })

  it('triggers onResendVerification when email is not verified and option is clicked', async () => {
    const user = userEvent.setup()
    render(<UserActionsDropdown {...defaultProps} user={mockUserActive} />)

    await user.click(screen.getByRole('button', { name: /user actions/i }))
    await user.click(screen.getByText('Resend Email Verification'))

    expect(defaultProps.onResendVerification).toHaveBeenCalledWith(
      mockUserActive,
    )
  })

  it('hides Resend Email Verification option when email is already verified', async () => {
    const user = userEvent.setup()
    render(
      <UserActionsDropdown
        {...defaultProps}
        user={{ ...mockUserActive, emailVerified: true }}
      />,
    )

    await user.click(screen.getByRole('button', { name: /user actions/i }))
    expect(
      screen.queryByText('Resend Email Verification'),
    ).not.toBeInTheDocument()
  })

  it('opens and closes Sessions modal', async () => {
    const user = userEvent.setup()
    render(<UserActionsDropdown {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /user actions/i }))
    await user.click(screen.getByText('Sessions'))

    expect(screen.getByTestId('sessions-modal')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close Sessions' }))
    expect(screen.queryByTestId('sessions-modal')).not.toBeInTheDocument()
  })

  it('opens and closes Activity Log modal', async () => {
    const user = userEvent.setup()
    render(<UserActionsDropdown {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /user actions/i }))
    await user.click(screen.getByText('Activity Log'))

    expect(screen.getByTestId('activity-modal')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close Activity' }))
    expect(screen.queryByTestId('activity-modal')).not.toBeInTheDocument()
  })

  it('opens Block User confirmation modal and executes block action successfully', async () => {
    const user = userEvent.setup()
    vi.mocked(blockAdminUser).mockResolvedValueOnce({ success: true } as any)

    render(<UserActionsDropdown {...defaultProps} user={mockUserActive} />)

    await user.click(screen.getByRole('button', { name: /user actions/i }))
    await user.click(screen.getByText('Block User'))

    expect(screen.getByText('Block User Account')).toBeInTheDocument()

    const confirmBtn = screen.getByRole('button', { name: /yes, block user/i })
    await user.click(confirmBtn)

    expect(blockAdminUser).toHaveBeenCalledWith({
      data: { userId: mockUserActive.id },
    })

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalledTimes(1)
    })
  })

  it('opens Unblock User confirmation modal and executes unblock action successfully', async () => {
    const user = userEvent.setup()
    vi.mocked(unblockAdminUser).mockResolvedValueOnce({ success: true } as any)

    render(<UserActionsDropdown {...defaultProps} user={mockUserBanned} />)

    await user.click(screen.getByRole('button', { name: /user actions/i }))
    await user.click(screen.getByText('Unblock User'))

    expect(screen.getByText('Unblock User Account')).toBeInTheDocument()

    const confirmBtn = screen.getByRole('button', {
      name: /yes, unblock user/i,
    })
    await user.click(confirmBtn)

    expect(unblockAdminUser).toHaveBeenCalledWith({
      data: { userId: mockUserBanned.id },
    })

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalledTimes(1)
    })
  })

  it('allows canceling block confirmation modal', async () => {
    const user = userEvent.setup()
    render(<UserActionsDropdown {...defaultProps} user={mockUserActive} />)

    await user.click(screen.getByRole('button', { name: /user actions/i }))
    await user.click(screen.getByText('Block User'))

    expect(screen.getByText('Block User Account')).toBeInTheDocument()

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' })
    await user.click(cancelBtn)

    expect(screen.queryByText('Block User Account')).not.toBeInTheDocument()
  })

  it('catches and logs error when block/unblock action fails', async () => {
    const user = userEvent.setup()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(blockAdminUser).mockRejectedValueOnce(new Error('Network error'))

    render(<UserActionsDropdown {...defaultProps} user={mockUserActive} />)

    await user.click(screen.getByRole('button', { name: /user actions/i }))
    await user.click(screen.getByText('Block User'))
    await user.click(screen.getByRole('button', { name: /yes, block user/i }))

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Action failed',
        expect.any(Error),
      )
    })
  })
})

