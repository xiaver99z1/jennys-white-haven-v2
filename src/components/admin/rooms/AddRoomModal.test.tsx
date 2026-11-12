import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AddRoomModal } from './AddRoomModal'
import { createRoom } from '#/server/room-actions'

class MockFileReader {
  onloadend: (() => void) | null = null
  result = 'data:image/png;base64,validroomimage'
  readAsDataURL() {
    if (this.onloadend) this.onloadend()
  }
}

vi.mock('#/server/room-actions', () => ({
  createRoom: vi.fn(),
}))

vi.mock('#/components/admin/rooms/AmenitySelectorModal', () => ({
  AmenitySelectorModal: ({ isOpen, onClose, onSave }: any) => {
    if (!isOpen) return null
    return (
      <div data-testid="mock-amenity-modal">
        <button
          type="button"
          onClick={() => onSave(['Free Wi-Fi', 'Smart TV'])}
        >
          Save Amenities
        </button>
        <button type="button" onClick={() => onSave([])}>
          Clear Amenities
        </button>
        <button type="button" onClick={onClose}>
          Close Amenities
        </button>
      </div>
    )
  },
}))

describe('AddRoomModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
  }

  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    vi.unstubAllGlobals()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <AddRoomModal {...defaultProps} isOpen={false} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders modal title and form fields when open', () => {
    render(<AddRoomModal {...defaultProps} />)

    expect(screen.getByText(/add new room/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/e\.g\. 101/i)).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(/e\.g\. deluxe ocean view suite/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /create room/i }),
    ).toBeInTheDocument()
  })

  it('allows user to fill out form fields, capacity, price, description, and select room type', async () => {
    const user = userEvent.setup({ delay: null })
    render(<AddRoomModal {...defaultProps} />)

    const roomNumberInput = screen.getByPlaceholderText(/e\.g\. 101/i)
    const nameInput = screen.getByPlaceholderText(
      /e\.g\. deluxe ocean view suite/i,
    )
    const descriptionInput = screen.getByPlaceholderText(
      /brief description of the room/i,
    )

    await user.type(roomNumberInput, '205')
    await user.type(nameInput, 'Presidential Villa')
    await user.type(descriptionInput, 'Panoramic beachfront view.')

    const selects = screen.getAllByRole('combobox')
    await user.selectOptions(selects[0], 'Suite')

    const numberInputs = screen.getAllByRole('spinbutton')
    fireEvent.change(numberInputs[0], { target: { value: '6' } })
    fireEvent.change(numberInputs[1], { target: { value: '7500' } })

    expect(roomNumberInput).toHaveValue('205')
    expect(nameInput).toHaveValue('Presidential Villa')
    expect(descriptionInput).toHaveValue('Panoramic beachfront view.')
    expect(numberInputs[0]).toHaveValue(6)
    expect(numberInputs[1]).toHaveValue(7500)
  }, 15000)

  it('closes modal when cancel or close button is clicked', async () => {
    const user = userEvent.setup({ delay: null })
    render(<AddRoomModal {...defaultProps} />)

    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelBtn)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('handles successful room creation on submit', async () => {
    vi.mocked(createRoom).mockResolvedValueOnce({ success: true } as any)
    const user = userEvent.setup({ delay: null })

    render(<AddRoomModal {...defaultProps} />)

    await user.type(screen.getByPlaceholderText(/e\.g\. 101/i), '105')
    await user.type(
      screen.getByPlaceholderText(/e\.g\. deluxe ocean view suite/i),
      'Garden Cabana',
    )

    const submitBtn = screen.getByRole('button', { name: /create room/i })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(createRoom).toHaveBeenCalledWith({
        data: expect.objectContaining({
          roomNumber: '105',
          name: 'Garden Cabana',
        }),
      })
      expect(mockOnSuccess).toHaveBeenCalledTimes(1)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  it('handles error when room creation fails (catch block with custom message)', async () => {
    vi.mocked(createRoom).mockRejectedValueOnce(
      new Error('Room number already exists'),
    )
    const user = userEvent.setup({ delay: null })

    render(<AddRoomModal {...defaultProps} />)

    await user.type(screen.getByPlaceholderText(/e\.g\. 101/i), '101')
    await user.type(
      screen.getByPlaceholderText(/e\.g\. deluxe ocean view suite/i),
      'Duplicate Room',
    )

    await user.click(screen.getByRole('button', { name: /create room/i }))

    await waitFor(() => {
      expect(screen.getByText('Room number already exists')).toBeInTheDocument()
    })
  })

  it('falls back to default error message when error has no message', async () => {
    vi.mocked(createRoom).mockRejectedValueOnce({})
    const user = userEvent.setup({ delay: null })

    render(<AddRoomModal {...defaultProps} />)

    await user.type(screen.getByPlaceholderText(/e\.g\. 101/i), '102')
    await user.type(
      screen.getByPlaceholderText(/e\.g\. deluxe ocean view suite/i),
      'Fallback Room',
    )

    await user.click(screen.getByRole('button', { name: /create room/i }))

    await waitFor(() => {
      expect(screen.getByText(/failed to create room/i)).toBeInTheDocument()
    })
  })

  it('shows error when uploading non-image file', () => {
    render(<AddRoomModal {...defaultProps} />)

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const invalidFile = new File(['dummy'], 'document.pdf', {
      type: 'application/pdf',
    })

    fireEvent.change(fileInput, { target: { files: [invalidFile] } })

    expect(
      screen.getByText('Please upload valid image files (JPG, PNG, WEBP).'),
    ).toBeInTheDocument()
  })

  it('shows error when uploading oversized image file (>5MB)', () => {
    render(<AddRoomModal {...defaultProps} />)

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const largeFile = new File(['dummy'], 'huge.png', { type: 'image/png' })
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 })

    fireEvent.change(fileInput, { target: { files: [largeFile] } })

    expect(
      screen.getByText('Image file size must be less than 5MB.'),
    ).toBeInTheDocument()
  })

  it('does nothing when file upload event has no files', () => {
    render(<AddRoomModal {...defaultProps} />)

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: null } })

    expect(screen.getByText(/room photos & gallery \(0\)/i)).toBeInTheDocument()
  })

  it('successfully uploads valid image, previews via the Maximize button, closes lightbox via X button, and removes image', async () => {
    vi.stubGlobal('FileReader', MockFileReader)

    render(<AddRoomModal {...defaultProps} />)

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const validFile = new File(['dummy'], 'room.png', { type: 'image/png' })

    fireEvent.change(fileInput, { target: { files: [validFile] } })

    const thumbnail = await screen.findByAltText('Room photo 1')
    expect(thumbnail).toBeInTheDocument()

    const photoContainer = thumbnail.closest('div')!
    const photoButtons = photoContainer.querySelectorAll('button')
    fireEvent.click(photoButtons[0])

    const fullscreenImg = screen.getByAltText('Fullscreen Preview')
    expect(fullscreenImg).toBeInTheDocument()

    fireEvent.click(fullscreenImg)
    expect(screen.getByAltText('Fullscreen Preview')).toBeInTheDocument()

    const closeLightboxBtn =
      fullscreenImg.parentElement!.querySelector('button')!
    fireEvent.click(closeLightboxBtn)
    expect(screen.queryByAltText('Fullscreen Preview')).not.toBeInTheDocument()

    fireEvent.click(photoButtons[1])
    expect(screen.queryByAltText('Room photo 1')).not.toBeInTheDocument()
  })

  it('successfully previews via clicking the thumbnail image directly', async () => {
    vi.stubGlobal('FileReader', MockFileReader)

    render(<AddRoomModal {...defaultProps} />)

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const validFile = new File(['dummy'], 'room.png', { type: 'image/png' })

    fireEvent.change(fileInput, { target: { files: [validFile] } })

    const thumbnail = await screen.findByAltText('Room photo 1')
    fireEvent.click(thumbnail)

    const fullscreenImg = screen.getByAltText('Fullscreen Preview')
    expect(fullscreenImg).toBeInTheDocument()

    fireEvent.click(fullscreenImg.parentElement!)
    expect(screen.queryByAltText('Fullscreen Preview')).not.toBeInTheDocument()
  })

  it('displays "No amenities selected yet." when onSave is called with an empty list', async () => {
    const user = userEvent.setup({ delay: null })
    render(<AddRoomModal {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /manage amenities/i }))
    expect(screen.getByTestId('mock-amenity-modal')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear Amenities' }))
    expect(screen.getByText(/no amenities selected/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save Amenities' }))
    expect(screen.getByText('Smart TV')).toBeInTheDocument()
  })

  it('closes AmenitySelectorModal when onClose is triggered', async () => {
    const user = userEvent.setup({ delay: null })
    render(<AddRoomModal {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /manage amenities/i }))
    expect(screen.getByTestId('mock-amenity-modal')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close Amenities' }))
    expect(screen.queryByTestId('mock-amenity-modal')).not.toBeInTheDocument()
  })
})
