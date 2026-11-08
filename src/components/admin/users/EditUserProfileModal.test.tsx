import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EditUserProfileModal } from './EditUserProfileModal'
import { updateAdminUser } from '#/server/admin-actions'

vi.mock('#/server/admin-actions', () => ({
  updateAdminUser: vi.fn(),
}))

describe('EditUserProfileModal', () => {
  const mockUser = {
    id: 'user-123',
    name: 'Alice Johnson',
    role: 'MANAGER',
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
      <EditUserProfileModal {...defaultProps} isOpen={false} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when user prop is null', () => {
    const { container } = render(
      <EditUserProfileModal {...defaultProps} user={null} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('populates initial user values and keeps "Save Changes" disabled when unchanged', () => {
    render(<EditUserProfileModal {...defaultProps} />)

    expect(
      screen.getByRole('heading', { name: /edit staff profile/i }),
    ).toBeInTheDocument()

    const nameInput = screen.getByDisplayValue('Alice Johnson')
    expect(nameInput).toBeInTheDocument()

    const roleSelect = screen.getByRole('combobox')
    expect(roleSelect).toHaveValue('MANAGER')

    const saveBtn = screen.getByRole('button', { name: /save changes/i })
    expect(saveBtn).toBeDisabled()
  })

  it('renders receptionist role default when user role is missing/null', () => {
    render(
      <EditUserProfileModal
        {...defaultProps}
        user={{ id: 'user-2', name: 'Bob', role: null }}
      />,
    )

    const roleSelect = screen.getByRole('combobox')
    expect(roleSelect).toHaveValue('RECEPTIONIST')
  })

  it('enables "Save Changes" when form fields are edited', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<EditUserProfileModal {...defaultProps} />)

    const nameInput = screen.getByDisplayValue('Alice Johnson')
    await user.clear(nameInput)
    await user.type(nameInput, 'Alice Smith')

    const saveBtn = screen.getByRole('button', { name: /save changes/i })
    expect(saveBtn).not.toBeDisabled()
  })

  it('shows password length validation error when password is too short', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<EditUserProfileModal {...defaultProps} />)

    const pwdInput = screen.getByPlaceholderText(/8-16 chars/i)
    const confirmInput = screen.getByPlaceholderText(/re-enter new password/i)

    await user.type(pwdInput, 'Short1!')
    await user.type(confirmInput, 'Short1!')

    const saveBtn = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveBtn)

    expect(
      screen.getByText('Password must be between 8 and 16 characters long.'),
    ).toBeInTheDocument()
  })

  it('shows password uppercase validation error', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<EditUserProfileModal {...defaultProps} />)

    const pwdInput = screen.getByPlaceholderText(/8-16 chars/i)
    const confirmInput = screen.getByPlaceholderText(/re-enter new password/i)

    await user.type(pwdInput, 'lowercase1!')
    await user.type(confirmInput, 'lowercase1!')

    const saveBtn = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveBtn)

    expect(
      screen.getByText('Password must contain at least one uppercase letter.'),
    ).toBeInTheDocument()
  })

  it('shows password lowercase validation error', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<EditUserProfileModal {...defaultProps} />)

    const pwdInput = screen.getByPlaceholderText(/8-16 chars/i)
    const confirmInput = screen.getByPlaceholderText(/re-enter new password/i)

    await user.type(pwdInput, 'UPPERCASE1!')
    await user.type(confirmInput, 'UPPERCASE1!')

    const saveBtn = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveBtn)

    expect(
      screen.getByText('Password must contain at least one lowercase letter.'),
    ).toBeInTheDocument()
  })

  it('shows password number validation error', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<EditUserProfileModal {...defaultProps} />)

    const pwdInput = screen.getByPlaceholderText(/8-16 chars/i)
    const confirmInput = screen.getByPlaceholderText(/re-enter new password/i)

    await user.type(pwdInput, 'NoNumbersHere!')
    await user.type(confirmInput, 'NoNumbersHere!')

    const saveBtn = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveBtn)

    expect(
      screen.getByText('Password must contain at least one number.'),
    ).toBeInTheDocument()
  })

  it('shows password special character validation error', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<EditUserProfileModal {...defaultProps} />)

    const pwdInput = screen.getByPlaceholderText(/8-16 chars/i)
    const confirmInput = screen.getByPlaceholderText(/re-enter new password/i)

    await user.type(pwdInput, 'NoSpecialChar1')
    await user.type(confirmInput, 'NoSpecialChar1')

    const saveBtn = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveBtn)

    expect(
      screen.getByText('Password must contain at least one special character.'),
    ).toBeInTheDocument()
  })

  it('shows error when password and confirm password do not match', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<EditUserProfileModal {...defaultProps} />)

    const pwdInput = screen.getByPlaceholderText(/8-16 chars/i)
    const confirmInput = screen.getByPlaceholderText(/re-enter new password/i)

    await user.type(pwdInput, 'ValidPass1!')
    await user.type(confirmInput, 'DifferentPass1!')

    const saveBtn = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveBtn)

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
  })

  it('opens confirmation popup and allows canceling', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<EditUserProfileModal {...defaultProps} />)

    const nameInput = screen.getByDisplayValue('Alice Johnson')
    await user.clear(nameInput)
    await user.type(nameInput, 'Alice Updated')

    const saveBtn = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveBtn)

    expect(screen.getByText('Are you sure?')).toBeInTheDocument()

    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' })
    await user.click(cancelButtons[cancelButtons.length - 1])

    expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument()
  })

  it('executes successful profile update and auto-closes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    vi.mocked(updateAdminUser).mockResolvedValueOnce({
      success: true,
      message: 'Profile updated successfully!',
    } as any)

    render(<EditUserProfileModal {...defaultProps} />)

    await user.selectOptions(screen.getByRole('combobox'), 'OWNER')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const confirmBtn = screen.getByRole('button', {
      name: /yes, save changes/i,
    })
    await user.click(confirmBtn)

    expect(updateAdminUser).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        name: 'Alice Johnson',
        password: undefined,
        role: 'OWNER',
      },
    })

    await waitFor(() => {
      expect(
        screen.getByText('Profile updated successfully!'),
      ).toBeInTheDocument()
    })

    expect(defaultProps.onSuccess).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1200)
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('handles profile update failure from API', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    vi.mocked(updateAdminUser).mockRejectedValueOnce(
      new Error('Unauthorized request'),
    )

    render(<EditUserProfileModal {...defaultProps} />)

    const nameInput = screen.getByDisplayValue('Alice Johnson')
    await user.type(nameInput, ' Extra')

    await user.click(screen.getByRole('button', { name: /save changes/i }))
    await user.click(screen.getByRole('button', { name: /yes, save changes/i }))

    await waitFor(() => {
      expect(screen.getByText('Unauthorized request')).toBeInTheDocument()
    })
  })

  it('handles generic profile update error without error text', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    vi.mocked(updateAdminUser).mockRejectedValueOnce({})

    render(<EditUserProfileModal {...defaultProps} />)

    const nameInput = screen.getByDisplayValue('Alice Johnson')
    await user.type(nameInput, ' Extra')

    await user.click(screen.getByRole('button', { name: /save changes/i }))
    await user.click(screen.getByRole('button', { name: /yes, save changes/i }))

    await waitFor(() => {
      expect(screen.getByText('Failed to update profile.')).toBeInTheDocument()
    })
  })

  it('triggers onClose when main Cancel button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<EditUserProfileModal {...defaultProps} />)

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' })
    await user.click(cancelBtn)

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })
})
