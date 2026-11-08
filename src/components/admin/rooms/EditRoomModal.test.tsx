import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EditRoomModal } from './EditRoomModal'
import { updateRoom, deleteRoom } from '#/server/room-actions'

vi.mock('#/server/room-actions', () => ({
  updateRoom: vi.fn(),
  deleteRoom: vi.fn(),
}))

// Mock child modals to easily trigger their exact callbacks (onClose, onSave, onConfirm)
vi.mock('#/components/admin/rooms/AmenitySelectorModal', () => ({
  AmenitySelectorModal: ({ isOpen, onClose, onSave }: any) =>
    isOpen ? (
      <div data-testid="amenity-modal">
        <button onClick={onClose}>Close Amenity Modal</button>
        <button onClick={() => onSave(['Free Wi-Fi', 'Pool Access'])}>
          Save New Amenities
        </button>
        <button onClick={() => onSave(['Free Wi-Fi', 'Smart TV'])}>
          Save Same Length Different Amenities
        </button>
        <button onClick={() => onSave([])}>Clear All Amenities</button>
      </div>
    ) : null,
}))

vi.mock('#/components/common/ConfirmModal', () => ({
  ConfirmModal: ({ isOpen, onConfirm, onClose }: any) =>
    isOpen ? (
      <div data-testid="confirm-modal">
        <button onClick={onConfirm}>Yes, Delete</button>
        <button onClick={onClose}>Cancel Delete</button>
      </div>
    ) : null,
}))

describe('EditRoomModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()
  const mockOnSaveStart = vi.fn()
  const mockOnDeleteStart = vi.fn()

  const mockRoom = {
    id: 'room-1',
    roomNumber: '101',
    name: 'Ocean View Suite',
    type: 'Suite',
    capacity: 4,
    pricePerNight: 4500,
    status: 'AVAILABLE',
    description: 'Beautiful suite facing the ocean.',
    amenities: ['Free Wi-Fi', 'Air Conditioning'],
    images: ['https://example.com/room1.jpg', 'https://example.com/room2.jpg'],
  }

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
    onSaveStart: mockOnSaveStart,
    onDeleteStart: mockOnDeleteStart,
    room: mockRoom,
  }

  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    // Silence expected console.error logs during error-handling tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('returns null when isOpen is false or room is null, and handles fallback room properties', () => {
    const { container, rerender } = render(
      <EditRoomModal {...defaultProps} isOpen={false} />,
    )
    expect(container.firstChild).toBeNull()

    rerender(<EditRoomModal {...defaultProps} isOpen={true} room={null} />)
    expect(container.firstChild).toBeNull()

    // Test getInitialFormData nullish fallbacks
    rerender(
      <EditRoomModal
        {...defaultProps}
        isOpen={true}
        room={{
          id: 'room-empty',
          roomNumber: undefined as any,
          name: undefined as any,
          type: undefined as any,
          description: null,
          capacity: undefined as any,
          pricePerNight: 0,
          status: undefined as any,
          amenities: undefined as any,
          images: undefined,
        }}
      />,
    )
    expect(screen.getByText('No amenities selected.')).toBeInTheDocument()
  })

  it('evaluates hasChanges across every individual field (roomNumber, name, type, description, capacity, pricePerNight, status)', () => {
    render(<EditRoomModal {...defaultProps} />)

    const saveBtn = screen.getByRole('button', { name: /save changes/i })
    expect(saveBtn).toBeDisabled()

    // 1. roomNumber change & revert
    const roomNumInput = screen.getByDisplayValue('101')
    fireEvent.change(roomNumInput, { target: { value: '102' } })
    expect(saveBtn).not.toBeDisabled()
    fireEvent.change(roomNumInput, { target: { value: '101' } })
    expect(saveBtn).toBeDisabled()

    // 2. name change & revert
    const nameInput = screen.getByDisplayValue('Ocean View Suite')
    fireEvent.change(nameInput, { target: { value: 'New Name' } })
    expect(saveBtn).not.toBeDisabled()
    fireEvent.change(nameInput, { target: { value: 'Ocean View Suite' } })
    expect(saveBtn).toBeDisabled()

    // 3. status change & revert (first select)
    const [statusSelect, typeSelect] = screen.getAllByRole('combobox')
    fireEvent.change(statusSelect, { target: { value: 'MAINTENANCE' } })
    expect(saveBtn).not.toBeDisabled()
    fireEvent.change(statusSelect, { target: { value: 'AVAILABLE' } })
    expect(saveBtn).toBeDisabled()

    // 4. type change & revert (second select)
    fireEvent.change(typeSelect, { target: { value: 'Standard' } })
    expect(saveBtn).not.toBeDisabled()
    fireEvent.change(typeSelect, { target: { value: 'Suite' } })
    expect(saveBtn).toBeDisabled()

    // 5. description change & revert
    const descInput = screen.getByDisplayValue(
      'Beautiful suite facing the ocean.',
    )
    fireEvent.change(descInput, { target: { value: 'Updated desc' } })
    expect(saveBtn).not.toBeDisabled()
    fireEvent.change(descInput, {
      target: { value: 'Beautiful suite facing the ocean.' },
    })
    expect(saveBtn).toBeDisabled()

    // 6. capacity change & revert
    const capacityInput = screen.getByDisplayValue('4')
    fireEvent.change(capacityInput, { target: { value: '6' } })
    expect(saveBtn).not.toBeDisabled()
    fireEvent.change(capacityInput, { target: { value: '4' } })
    expect(saveBtn).toBeDisabled()

    // 7. pricePerNight change & revert
    const priceInput = screen.getByDisplayValue('4500')
    fireEvent.change(priceInput, { target: { value: '5000' } })
    expect(saveBtn).not.toBeDisabled()
    fireEvent.change(priceInput, { target: { value: '4500' } })
    expect(saveBtn).toBeDisabled()

    // Guard on direct form submit when !hasChanges
    const form = saveBtn.closest('form')!
    fireEvent.submit(form)
    expect(updateRoom).not.toHaveBeenCalled()
  })

  it('handles AmenitySelectorModal open, close, length change, and same-length content change', () => {
    render(<EditRoomModal {...defaultProps} />)
    const saveBtn = screen.getByRole('button', { name: /save changes/i })

    // Open AmenitySelectorModal
    fireEvent.click(screen.getByRole('button', { name: /manage amenities/i }))
    expect(screen.getByTestId('amenity-modal')).toBeInTheDocument()

    // Test same-length but different item (covers line 99-100)
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Save Same Length Different Amenities',
      }),
    )
    expect(saveBtn).not.toBeDisabled()

    // Test different length (covers line 98 & empty amenities state)
    fireEvent.click(screen.getByRole('button', { name: 'Clear All Amenities' }))
    expect(screen.getByText('No amenities selected.')).toBeInTheDocument()
    expect(saveBtn).not.toBeDisabled()

    // Test onClose callback (covers line 510)
    fireEvent.click(screen.getByRole('button', { name: 'Close Amenity Modal' }))
    expect(screen.queryByTestId('amenity-modal')).not.toBeInTheDocument()
  })

  it('validates image upload (null files, non-image type, >5MB size, valid file) and image removal', async () => {
    // Mock FileReader for deterministic synchronous onloadend execution
    class MockFileReader {
      onloadend: (() => void) | null = null
      result = 'data:image/png;base64,newimage'
      readAsDataURL() {
        if (this.onloadend) this.onloadend()
      }
    }
    vi.stubGlobal('FileReader', MockFileReader)

    render(<EditRoomModal {...defaultProps} />)
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement

    // 1. Null files guard (line 116)
    fireEvent.change(fileInput, { target: { files: null } })

    // 2. Invalid file type (lines 119-121)
    const invalidTypeFile = new File(['dummy'], 'doc.pdf', {
      type: 'application/pdf',
    })
    fireEvent.change(fileInput, { target: { files: [invalidTypeFile] } })
    expect(
      screen.getByText('Please upload valid image files (JPG, PNG, WEBP).'),
    ).toBeInTheDocument()

    // 3. File size > 5MB (lines 123-125)
    const largeFile = new File(['dummy'], 'large.png', { type: 'image/png' })
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 })
    fireEvent.change(fileInput, { target: { files: [largeFile] } })
    expect(
      screen.getByText('Image file size must be less than 5MB.'),
    ).toBeInTheDocument()

    // 4. Remove first image & upload valid image so length is back to 2, testing line 106-107 (same length, different image URL)
    const photo1 = screen.getByAltText('Room photo 1')
    const photo1Container = photo1.closest('div')!
    const photo1Buttons = photo1Container.querySelectorAll('button')
    // Second button inside photo container is handleRemoveImage (line 285 & lines 140-145)
    fireEvent.click(photo1Buttons[1])

    // Upload valid image to restore length to 2 with a different URL
    const validFile = new File(['dummy'], 'valid.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [validFile] } })

    const saveBtn = screen.getByRole('button', { name: /save changes/i })
    expect(saveBtn).not.toBeDisabled()

    vi.unstubAllGlobals()
  })

  it('opens image lightbox via img click and maximize button, stops propagation on preview img, and closes via X button and backdrop', () => {
    render(<EditRoomModal {...defaultProps} />)

    // 1. Click directly on <img> to open lightbox (line 274)
    const photo1 = screen.getByAltText('Room photo 1')
    fireEvent.click(photo1)

    const previewImg = screen.getByAltText('Fullscreen Preview')
    expect(previewImg).toBeInTheDocument()

    // Click preview image to test e.stopPropagation() (line 532)
    fireEvent.click(previewImg)
    expect(screen.getByAltText('Fullscreen Preview')).toBeInTheDocument()

    // Close lightbox via backdrop click (line 520)
    const backdrop = previewImg.parentElement!
    fireEvent.click(backdrop)
    expect(screen.queryByAltText('Fullscreen Preview')).not.toBeInTheDocument()

    // 2. Open lightbox via Maximize2 button (line 278) and close via X button (line 523)
    const photo1Container = photo1.closest('div')!
    const maximizeBtn = photo1Container.querySelectorAll('button')[0]
    fireEvent.click(maximizeBtn)

    const previewImgAgain = screen.getByAltText('Fullscreen Preview')
    const closeLightboxBtn =
      previewImgAgain.parentElement!.querySelector('button')!
    fireEvent.click(closeLightboxBtn)
    expect(screen.queryByAltText('Fullscreen Preview')).not.toBeInTheDocument()
  })

  it('submits updated room data successfully', async () => {
    vi.mocked(updateRoom).mockResolvedValueOnce({ success: true } as any)

    render(<EditRoomModal {...defaultProps} />)

    // Clear description to also cover `formData.description || undefined` branch
    fireEvent.change(
      screen.getByDisplayValue('Beautiful suite facing the ocean.'),
      { target: { value: '' } },
    )

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(mockOnSaveStart).toHaveBeenCalledWith('room-1')
      expect(mockOnClose).toHaveBeenCalled()
      expect(updateRoom).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'room-1',
          description: undefined,
        }),
      })
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('handles error when room update fails with custom message and fallback message', async () => {
    vi.mocked(updateRoom).mockRejectedValueOnce(new Error('Update failed'))

    const { unmount } = render(<EditRoomModal {...defaultProps} />)

    fireEvent.change(screen.getByDisplayValue('Ocean View Suite'), {
      target: { value: 'Updated Suite' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument()
    })

    unmount()

    // Fallback when error has no message
    vi.mocked(updateRoom).mockRejectedValueOnce({})
    render(<EditRoomModal {...defaultProps} />)

    fireEvent.change(screen.getByDisplayValue('Ocean View Suite'), {
      target: { value: 'Updated Suite' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText('Failed to update room.')).toBeInTheDocument()
    })
  })

  it('opens ConfirmModal, cancels deletion, and confirms deletion successfully', async () => {
    vi.mocked(deleteRoom).mockResolvedValueOnce({ success: true } as any)

    render(<EditRoomModal {...defaultProps} />)

    // Open delete confirmation modal
    fireEvent.click(screen.getByRole('button', { name: /delete room/i }))
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument()

    // Cancel deletion (covers line 505)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Delete' }))
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument()

    // Re-open and confirm deletion
    fireEvent.click(screen.getByRole('button', { name: /delete room/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Delete' }))

    await waitFor(() => {
      expect(mockOnDeleteStart).toHaveBeenCalledWith('room-1')
      expect(deleteRoom).toHaveBeenCalledWith({ data: { id: 'room-1' } })
      expect(mockOnSuccess).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('handles error when room deletion fails with custom message and fallback message', async () => {
    vi.mocked(deleteRoom).mockRejectedValueOnce(new Error('Delete failed'))

    const { unmount } = render(<EditRoomModal {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /delete room/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Delete' }))

    await waitFor(() => {
      expect(screen.getByText('Delete failed')).toBeInTheDocument()
    })

    unmount()

    // Fallback when error has no message
    vi.mocked(deleteRoom).mockRejectedValueOnce({})
    render(<EditRoomModal {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /delete room/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Delete' }))

    await waitFor(() => {
      expect(screen.getByText('Failed to delete room.')).toBeInTheDocument()
    })
  })
})
