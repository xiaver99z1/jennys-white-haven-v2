import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AddGuestModal } from './AddGuestModal'
import { createGuest } from '#/server/guest-actions'

vi.mock('#/server/guest-actions', () => ({
  createGuest: vi.fn(),
}))

describe('AddGuestModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <AddGuestModal {...defaultProps} isOpen={false} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders modal title and form fields when open', () => {
    render(<AddGuestModal {...defaultProps} />)

    expect(screen.getByText(/add new guest/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. Maria')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. Santos')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(/e\.g\. \+63 917 123 4567/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /create guest/i }),
    ).toBeInTheDocument()
  })

  it('allows user to fill out all fields and submit successfully', async () => {
    vi.mocked(createGuest).mockResolvedValueOnce({ success: true } as any)
    const user = userEvent.setup({ delay: null })

    render(<AddGuestModal {...defaultProps} />)

    await user.type(screen.getByPlaceholderText('e.g. Maria'), 'Maria')
    await user.type(screen.getByPlaceholderText('e.g. Santos'), 'Santos')
    await user.type(
      screen.getByPlaceholderText(/e\.g\. \+63 917 123 4567/i),
      '09171234567',
    )
    await user.type(
      screen.getByPlaceholderText(/e\.g\. maria@example\.com/i),
      'maria@example.com',
    )

    const nationalityInput = screen.getByPlaceholderText(/e\.g\. filipino/i)
    await user.clear(nationalityInput)
    await user.type(nationalityInput, 'Canadian')

    await user.selectOptions(screen.getByRole('combobox'), 'Passport')
    await user.type(
      screen.getByPlaceholderText(/e\.g\. n01-23-456789/i),
      'P987654',
    )
    await user.type(
      screen.getByPlaceholderText(/allergies, dietary restrictions/i),
      'VIP guest',
    )

    await user.click(screen.getByRole('button', { name: /create guest/i }))

    await waitFor(() => {
      expect(createGuest).toHaveBeenCalledWith({
        data: {
          firstName: 'Maria',
          lastName: 'Santos',
          email: 'maria@example.com',
          phone: '09171234567',
          idType: 'Passport',
          idNumber: 'P987654',
          nationality: 'Canadian',
          specialNotes: 'VIP guest',
        },
      })
      expect(mockOnSuccess).toHaveBeenCalledTimes(1)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  it('submits undefined for empty optional fields', async () => {
    vi.mocked(createGuest).mockResolvedValueOnce({ success: true } as any)
    const user = userEvent.setup({ delay: null })

    render(<AddGuestModal {...defaultProps} />)

    await user.type(screen.getByPlaceholderText('e.g. Maria'), 'Juan')
    await user.type(screen.getByPlaceholderText('e.g. Santos'), 'Cruz')
    await user.type(
      screen.getByPlaceholderText(/e\.g\. \+63 917 123 4567/i),
      '09180001111',
    )
    await user.clear(screen.getByPlaceholderText(/e\.g\. filipino/i))
    await user.selectOptions(screen.getByRole('combobox'), '')

    await user.click(screen.getByRole('button', { name: /create guest/i }))

    await waitFor(() => {
      expect(createGuest).toHaveBeenCalledWith({
        data: {
          firstName: 'Juan',
          lastName: 'Cruz',
          email: undefined,
          phone: '09180001111',
          idType: undefined,
          idNumber: undefined,
          nationality: undefined,
          specialNotes: undefined,
        },
      })
    })
  })

  it('handles error with custom message and fallback message when guest creation fails', async () => {
    vi.mocked(createGuest).mockRejectedValueOnce(
      new Error('Email already registered'),
    )
    const user = userEvent.setup({ delay: null })

    render(<AddGuestModal {...defaultProps} />)

    await user.type(screen.getByPlaceholderText('e.g. Maria'), 'Maria')
    await user.type(screen.getByPlaceholderText('e.g. Santos'), 'Santos')
    await user.type(
      screen.getByPlaceholderText(/e\.g\. \+63 917 123 4567/i),
      '09171234567',
    )

    await user.click(screen.getByRole('button', { name: /create guest/i }))

    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeInTheDocument()
    })

    vi.mocked(createGuest).mockRejectedValueOnce({})
    await user.click(screen.getByRole('button', { name: /create guest/i }))

    await waitFor(() => {
      expect(screen.getByText('Failed to create guest.')).toBeInTheDocument()
    })
  })

  it('closes modal when Cancel button is clicked', async () => {
    const user = userEvent.setup({ delay: null })
    render(<AddGuestModal {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})
