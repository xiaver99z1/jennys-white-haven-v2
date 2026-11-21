import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TouristSpotsEditor } from './TouristSpotsEditor'
import type { TouristSpotItem } from '#/types'

const { mockUploadAvatar, mockCompressImage } = vi.hoisted(() => ({
  mockUploadAvatar: vi.fn(),
  mockCompressImage: vi.fn(async (file: File) => file),
}))

vi.mock('#/server/upload', () => ({
  uploadAvatar: mockUploadAvatar,
}))

vi.mock('#/lib/image-compress', () => ({
  compressImageForUpload: mockCompressImage,
  IMAGE_UPLOAD_PRESETS: {
    editorial: { maxDimension: 1280, quality: 0.82 },
  },
}))

describe('TouristSpotsEditor', () => {
  const sampleSpots: TouristSpotItem[] = [
    {
      id: 'spot-1',
      name: 'Santiago Bay',
      category: 'Beach',
      location: 'San Francisco',
      travelTime: '10 mins',
      bestTime: 'Sunset',
      entranceFee: 'Free',
      description: 'White sandbar.',
      tips: 'Go before 5 PM.',
      image: '',
    },
    {
      id: 'spot-2',
      name: 'Bukilat Cave',
      category: 'Cave & Lagoon',
      location: 'Tudela',
      travelTime: '35 mins',
      bestTime: 'Midday',
      entranceFee: '₱50',
      description: 'Natural cave pool.',
      tips: 'Bring aqua shoes.',
      image: 'https://cdn.example.com/bukilat.webp',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state and adds a new tourist spot', () => {
    const onChange = vi.fn()
    const onError = vi.fn()

    render(
      <TouristSpotsEditor spots={[]} onChange={onChange} onError={onError} />,
    )

    expect(
      screen.getByText(/No tourist spots configured yet/i),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Add Tourist Spot/i }))
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'New Camotes Destination',
        category: 'Beach',
      }),
    ])
  })

  it('edits spot fields, reorders, removes photos, and deletes spots', () => {
    const onChange = vi.fn()
    const onError = vi.fn()

    render(
      <TouristSpotsEditor
        spots={sampleSpots}
        onChange={onChange}
        onError={onError}
      />,
    )

    fireEvent.change(screen.getByLabelText('Destination Name', { selector: '#spot-name-spot-1' }), {
      target: { value: 'Santiago White Sand' },
    })
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'spot-1', name: 'Santiago White Sand' }),
      sampleSpots[1],
    ])

    fireEvent.change(screen.getByLabelText('Category', { selector: '#spot-category-spot-1' }), {
      target: { value: 'Lake & Nature' },
    })
    fireEvent.change(screen.getByLabelText('Location / Barangay', { selector: '#spot-location-spot-1' }), {
      target: { value: 'Brgy. Santiago' },
    })
    fireEvent.change(screen.getByLabelText('Travel Time from Resort', { selector: '#spot-travel-spot-1' }), {
      target: { value: '5 mins' },
    })
    fireEvent.change(screen.getByLabelText('Best Time to Visit', { selector: '#spot-best-time-spot-1' }), {
      target: { value: 'Morning' },
    })
    fireEvent.change(screen.getByLabelText('Entrance Fee / Access Info', { selector: '#spot-fee-spot-1' }), {
      target: { value: '₱20' },
    })
    fireEvent.change(screen.getByLabelText('Description', { selector: '#spot-desc-spot-1' }), {
      target: { value: 'Calm waters' },
    })
    fireEvent.change(screen.getByLabelText('Guest Tip', { selector: '#spot-tips-spot-1' }), {
      target: { value: 'Try grilled fish' },
    })
    fireEvent.change(screen.getByLabelText('Spot 1 image URL'), {
      target: { value: 'https://cdn.example.com/santiago.webp' },
    })

    // Move spot 1 down
    fireEvent.click(screen.getByRole('button', { name: 'Move spot 1 down' }))
    expect(onChange).toHaveBeenLastCalledWith([sampleSpots[1], sampleSpots[0]])

    // Move spot 2 up
    fireEvent.click(screen.getByRole('button', { name: 'Move spot 2 up' }))
    expect(onChange).toHaveBeenLastCalledWith([sampleSpots[1], sampleSpots[0]])

    // Remove photo on spot 2
    fireEvent.click(screen.getByRole('button', { name: 'Remove Photo' }))
    expect(onChange).toHaveBeenLastCalledWith([
      sampleSpots[0],
      { ...sampleSpots[1], image: '' },
    ])

    // Remove spot 1
    fireEvent.click(screen.getByRole('button', { name: 'Remove spot 1' }))
    expect(onChange).toHaveBeenLastCalledWith([sampleSpots[1]])
  })

  it('validates and uploads compressed tourist spot photos, and handles upload errors', async () => {
    const onChange = vi.fn()
    const onError = vi.fn()
    const onUploadingChange = vi.fn()

    const { container } = render(
      <TouristSpotsEditor
        spots={[{ ...sampleSpots[0], name: '' }]}
        onChange={onChange}
        onError={onError}
        onUploadingChange={onUploadingChange}
      />,
    )

    expect(screen.getByText('Untitled Destination')).toBeInTheDocument()

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement

    // Empty file selection is ignored
    fireEvent.change(fileInput, { target: { files: [] } })
    expect(mockUploadAvatar).not.toHaveBeenCalled()

    // Non-image file rejected
    const badFile = new File(['hello'], 'doc.pdf', { type: 'application/pdf' })
    fireEvent.change(fileInput, { target: { files: [badFile] } })
    expect(onError).toHaveBeenCalledWith(
      'Please select a valid image file (JPG, PNG, WEBP, GIF).',
    )

    // Valid image upload succeeds
    mockUploadAvatar.mockResolvedValueOnce('/api/media/view?key=cms/spot.webp')
    const validFile = new File(['img'], 'beach.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [validFile] } })

    await waitFor(() => {
      expect(mockCompressImage).toHaveBeenCalledWith(validFile, 1280, 0.82)
      expect(onChange).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'spot-1',
          image: '/api/media/view?key=cms/spot.webp',
        }),
      ])
    })
    expect(onUploadingChange).toHaveBeenCalledWith(true)
    expect(onUploadingChange).toHaveBeenCalledWith(false)

    // Upload error handled gracefully
    mockUploadAvatar.mockRejectedValueOnce(new Error('Upload quota exceeded'))
    fireEvent.change(fileInput, { target: { files: [validFile] } })

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Upload quota exceeded')
    })
  })
})
