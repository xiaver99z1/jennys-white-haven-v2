import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EditGuestModal } from './EditGuestModal'
import { updateGuest, deleteGuest } from '#/server/guest-actions'

vi.mock('#/server/guest-actions', () => ({
  updateGuest: vi.fn(),
  deleteGuest: vi.fn(),
}))

describe('EditGuestModal', () => {
  const mockGuest = {
    id: 'guest-1',
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'maria@example.com',
    phone: '+63 917 123 4567',
    idType: 'Passport',
    idNumber: 'P1234567',
    nationality: 'Filipino',
    specialNotes: 'Prefers quiet room',
  }

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    onSaveStart: vi.fn(),
    onDeleteStart: vi.fn(),
    guest: mockGuest,
  }

  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('returns null when isOpen is false or guest is null, and handles fallback guest properties', () => {
    const { container, rerender } = render(
      <EditGuestModal {...defaultProps} isOpen={false} guest={null} />,
    )
    expect(container.firstChild).toBeNull()

    rerender(<EditGuestModal {...defaultProps} isOpen={true} guest={null} />)
    expect(container.firstChild).toBeNull()

    rerender(
      <EditGuestModal
        {...defaultProps}
        guest={{
          id: 'guest-2',
          firstName: undefined as any,
          lastName: undefined as any,
          email: null,
          phone: undefined as any,
          idType: null,
          idNumber: null,
          nationality: null,
          specialNotes: null,
        }}
      />,
    )
    expect(screen.getByDisplayValue('Filipino')).toBeInTheDocument()
  })

  it('evaluates hasChanges across every individual field and ignores submit when unchanged', () => {
    render(<EditGuestModal {...defaultProps} />)

    const saveBtn = screen.getByRole('button', { name: 'Save Changes' })
    expect(saveBtn).toBeDisabled()

    const form = saveBtn.closest('form')!
    fireEvent.submit(form)
    expect(updateGuest).not.toHaveBeenCalled()

    // 1. firstName
    const firstNameInput = screen.getByDisplayValue('Maria')
    fireEvent.change(firstNameInput, { target: { value: 'Marie' } })
    expect(saveBtn).toBeEnabled()
    fireEvent.change(firstNameInput, { target: { value: 'Maria' } })
    expect(saveBtn).toBeDisabled()

    // 2. lastName
    const lastNameInput = screen.getByDisplayValue('Santos')
    fireEvent.change(lastNameInput, { target: { value: 'Reyes' } })
    expect(saveBtn).toBeEnabled()
    fireEvent.change(lastNameInput, { target: { value: 'Santos' } })
    expect(saveBtn).toBeDisabled()

    // 3. phone
    const phoneInput = screen.getByDisplayValue('+63 917 123 4567')
    fireEvent.change(phoneInput, { target: { value: '09180001111' } })
    expect(saveBtn).toBeEnabled()
    fireEvent.change(phoneInput, { target: { value: '+63 917 123 4567' } })
    expect(saveBtn).toBeDisabled()

    // 4. email
    const emailInput = screen.getByDisplayValue('maria@example.com')
    fireEvent.change(emailInput, { target: { value: 'marie@example.com' } })
    expect(saveBtn).toBeEnabled()
    fireEvent.change(emailInput, { target: { value: 'maria@example.com' } })
    expect(saveBtn).toBeDisabled()

    // 5. nationality
    const nationalityInput = screen.getByDisplayValue('Filipino')
    fireEvent.change(nationalityInput, { target: { value: 'Japanese' } })
    expect(saveBtn).toBeEnabled()
    fireEvent.change(nationalityInput, { target: { value: 'Filipino' } })
    expect(saveBtn).toBeDisabled()

    // 6. idType
    const idTypeSelect = screen.getByDisplayValue('Passport')
    fireEvent.change(idTypeSelect, { target: { value: 'National ID' } })
    expect(saveBtn).toBeEnabled()
    fireEvent.change(idTypeSelect, { target: { value: 'Passport' } })
    expect(saveBtn).toBeDisabled()

    // 7. idNumber
    const idNumberInput = screen.getByDisplayValue('P1234567')
    fireEvent.change(idNumberInput, { target: { value: 'P9999999' } })
    expect(saveBtn).toBeEnabled()
    fireEvent.change(idNumberInput, { target: { value: 'P1234567' } })
    expect(saveBtn).toBeDisabled()

    // 8. specialNotes
    const notesInput = screen.getByDisplayValue('Prefers quiet room')
    fireEvent.change(notesInput, { target: { value: 'Allergic to peanuts' } })
    expect(saveBtn).toBeEnabled()
    fireEvent.change(notesInput, { target: { value: 'Prefers quiet room' } })
    expect(saveBtn).toBeDisabled()
  })

  it('opens ConfirmModal on save, cancels save, and submits updated guest data successfully', async () => {
    vi.mocked(updateGuest).mockResolvedValueOnce({ success: true } as any)
    render(<EditGuestModal {...defaultProps} />)

    fireEvent.change(screen.getByDisplayValue('Maria'), {
      target: { value: 'Marie' },
    })

    // Open save confirmation modal and cancel first
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(
      screen.getByText('Update Guest Maria Santos?'),
    ).toBeInTheDocument()

    const cancelBtns = screen.getAllByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelBtns[cancelBtns.length - 1])
    expect(
      screen.queryByText('Update Guest Maria Santos?'),
    ).not.toBeInTheDocument()

    // Re-open save confirmation modal and confirm
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save Changes' }))

    await waitFor(() => {
      expect(defaultProps.onSaveStart).toHaveBeenCalledWith('guest-1')
      expect(defaultProps.onClose).toHaveBeenCalled()
      expect(updateGuest).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'guest-1',
          firstName: 'Marie',
        }),
      })
      expect(defaultProps.onSuccess).toHaveBeenCalled()
    })
  })

  it('handles error when guest update fails with custom message and fallback message', async () => {
    vi.mocked(updateGuest).mockRejectedValueOnce(new Error('Update failed'))
    render(<EditGuestModal {...defaultProps} />)

    fireEvent.change(screen.getByDisplayValue('Maria'), {
      target: { value: 'Marie' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save Changes' }))

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument()
    })

    vi.mocked(updateGuest).mockRejectedValueOnce(new Error(''))
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save Changes' }))

    await waitFor(() => {
      expect(screen.getByText('Failed to update guest.')).toBeInTheDocument()
    })
  })

  it('opens ConfirmModal, cancels deletion, and confirms deletion successfully', async () => {
    vi.mocked(deleteGuest).mockResolvedValueOnce({ success: true })
    render(<EditGuestModal {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /delete guest/i }))
    expect(screen.getByText('Archive Guest Maria Santos?')).toBeInTheDocument()

    // Cancel confirmation modal
    const cancelBtns = screen.getAllByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelBtns[cancelBtns.length - 1])
    expect(
      screen.queryByText('Archive Guest Maria Santos?'),
    ).not.toBeInTheDocument()

    // Re-open and confirm deletion
    fireEvent.click(screen.getByRole('button', { name: /delete guest/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Delete' }))

    await waitFor(() => {
      expect(defaultProps.onDeleteStart).toHaveBeenCalledWith('guest-1')
      expect(deleteGuest).toHaveBeenCalledWith({ data: { id: 'guest-1' } })
      expect(defaultProps.onSuccess).toHaveBeenCalled()
    })
  })

  it('handles error when guest deletion fails with custom message and fallback message', async () => {
    vi.mocked(deleteGuest).mockRejectedValueOnce(new Error('Delete error'))
    render(<EditGuestModal {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /delete guest/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Delete' }))

    await waitFor(() => {
      expect(screen.getByText('Delete error')).toBeInTheDocument()
    })

    vi.mocked(deleteGuest).mockRejectedValueOnce(new Error(''))
    fireEvent.click(screen.getByRole('button', { name: /delete guest/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Delete' }))

    await waitFor(() => {
      expect(screen.getByText('Failed to delete guest.')).toBeInTheDocument()
    })
  })
})
