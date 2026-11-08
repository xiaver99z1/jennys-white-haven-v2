import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AddUserModal } from './AddUserModal'
import { createAdminUser } from '#/server/admin-actions'

vi.mock('#/server/admin-actions', () => ({
  createAdminUser: vi.fn(),
}))

describe('AddUserModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  }

  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    // Silence expected React act(...) warning caused by async auto-close timeout
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    consoleErrorSpy.mockRestore()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <AddUserModal {...defaultProps} isOpen={false} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders modal title, form inputs, and buttons when isOpen is true', () => {
    render(<AddUserModal {...defaultProps} />)

    expect(
      screen.getByRole('heading', { name: /add new resort staff/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(/e.g. jap ocifares/i),
    ).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(/staff@jennyswhitehaven.com/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /create user/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('handles successful user creation, triggers onSuccess, and auto-closes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    vi.mocked(createAdminUser).mockResolvedValueOnce({
      success: true,
      message:
        'Resort staff created successfully! Activation link sent to email.',
      user: {} as any,
    })

    render(<AddUserModal {...defaultProps} />)

    await user.type(
      screen.getByPlaceholderText(/e.g. jap ocifares/i),
      'Jane Doe',
    )
    await user.type(
      screen.getByPlaceholderText(/staff@jennyswhitehaven.com/i),
      'jane@jennyswhitehaven.com',
    )
    await user.selectOptions(screen.getByRole('combobox'), 'MANAGER')

    const submitBtn = screen.getByRole('button', { name: /create user/i })
    await user.click(submitBtn)

    expect(createAdminUser).toHaveBeenCalledWith({
      data: {
        name: 'Jane Doe',
        email: 'jane@jennyswhitehaven.com',
        role: 'MANAGER',
      },
    })

    await waitFor(() => {
      expect(
        screen.getByText(
          'Resort staff created successfully! Activation link sent to email.',
        ),
      ).toBeInTheDocument()
    })

    expect(defaultProps.onSuccess).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1500)

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('handles API error and displays error banner', async () => {
    const user = userEvent.setup()
    vi.mocked(createAdminUser).mockRejectedValueOnce(
      new Error('Email already exists'),
    )

    render(<AddUserModal {...defaultProps} />)

    await user.type(
      screen.getByPlaceholderText(/e.g. jap ocifares/i),
      'Jane Doe',
    )
    await user.type(
      screen.getByPlaceholderText(/staff@jennyswhitehaven.com/i),
      'existing@jennyswhitehaven.com',
    )

    const submitBtn = screen.getByRole('button', { name: /create user/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument()
    })

    expect(defaultProps.onSuccess).not.toHaveBeenCalled()
    expect(defaultProps.onClose).not.toHaveBeenCalled()
  })

  it('handles API error without explicit error message gracefully', async () => {
    const user = userEvent.setup()
    vi.mocked(createAdminUser).mockRejectedValueOnce({})

    render(<AddUserModal {...defaultProps} />)

    await user.type(
      screen.getByPlaceholderText(/e.g. jap ocifares/i),
      'Jane Doe',
    )
    await user.type(
      screen.getByPlaceholderText(/staff@jennyswhitehaven.com/i),
      'test@jennyswhitehaven.com',
    )

    const submitBtn = screen.getByRole('button', { name: /create user/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Failed to process request.')).toBeInTheDocument()
    })
  })

  it('triggers onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<AddUserModal {...defaultProps} />)

    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelBtn)

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })
})
