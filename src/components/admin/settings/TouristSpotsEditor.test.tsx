import { useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TouristSpotsEditor } from './TouristSpotsEditor'
import type { TouristSpotsUpdater } from './TouristSpotsEditor'
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
  isSupportedImageFile: (file: File) =>
    file.type.startsWith('image/') ||
    (!file.type && /\.(?:jpe?g|jfif|png|webp|avif)$/i.test(file.name)),
  IMAGE_UPLOAD_PRESETS: {
    editorial: { maxDimension: 1280, quality: 0.82 },
  },
}))

function StatefulEditorHarness({
  initialSpots,
  onError,
  onUploadingChange,
  onSpotsChange,
}: {
  initialSpots: TouristSpotItem[]
  onError: (msg: string | null) => void
  onUploadingChange?: (uploading: boolean) => void
  onSpotsChange?: (next: TouristSpotItem[]) => void
}) {
  const [spots, setSpots] = useState(initialSpots)
  const handleChange = (updater: TouristSpotsUpdater) => {
    setSpots((prev) => {
      const next = updater(prev)
      onSpotsChange?.(next)
      return next
    })
  }
  return (
    <TouristSpotsEditor
      spots={spots}
      onChange={handleChange}
      onError={onError}
      onUploadingChange={onUploadingChange}
    />
  )
}

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
      images: [],
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
      image: '/api/media/view?key=cms/bukilat-1.webp',
      images: [
        '/api/media/view?key=cms/bukilat-1.webp',
        '/api/media/view?key=cms/bukilat-2.webp',
      ],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state and auto-expands a newly added tourist spot', () => {
    const onError = vi.fn()
    const onSpotsChange = vi.fn()

    render(
      <StatefulEditorHarness
        initialSpots={[]}
        onError={onError}
        onSpotsChange={onSpotsChange}
      />,
    )

    expect(
      screen.getByText(/No tourist spots configured yet/i),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Add Tourist Spot/i }))
    expect(onSpotsChange).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'New Camotes Destination',
        category: 'Beach',
        images: [],
      }),
    ])
    // Newly added spot auto-expands its form fields
    expect(
      screen.getByDisplayValue('New Camotes Destination'),
    ).toBeInTheDocument()
  })

  it('collapses spots by default, expands via accordion, and manages gallery photos inside the modal', () => {
    const onError = vi.fn()
    const onSpotsChange = vi.fn()

    render(
      <StatefulEditorHarness
        initialSpots={sampleSpots}
        onError={onError}
        onSpotsChange={onSpotsChange}
      />,
    )

    // Spots start collapsed (no inputs mounted yet, ordering buttons visible)
    expect(
      screen.queryByLabelText('Destination Name', {
        selector: '#spot-name-spot-1',
      }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Move spot 1 down' }),
    ).toBeInTheDocument()

    // Expand Spot 1 via accordion toggle
    fireEvent.click(screen.getByRole('button', { name: 'Expand spot 1' }))

    const nameInput = screen.getByLabelText('Destination Name', {
      selector: '#spot-name-spot-1',
    })
    fireEvent.change(nameInput, { target: { value: 'Santiago White ' } })
    expect(nameInput).toHaveValue('Santiago White ')

    // Clearing the name does not delete the spot
    fireEvent.change(nameInput, { target: { value: '' } })
    expect(screen.getByText('Untitled Destination')).toBeInTheDocument()

    fireEvent.change(nameInput, { target: { value: 'Santiago White Sand' } })
    fireEvent.change(
      screen.getByLabelText('Category', { selector: '#spot-category-spot-1' }),
      { target: { value: 'Lake & Nature' } },
    )
    fireEvent.change(
      screen.getByLabelText('Location / Barangay', {
        selector: '#spot-location-spot-1',
      }),
      { target: { value: 'Brgy. Santiago' } },
    )
    fireEvent.change(
      screen.getByLabelText('Travel Time from Resort', {
        selector: '#spot-travel-spot-1',
      }),
      { target: { value: '5 mins' } },
    )
    fireEvent.change(
      screen.getByLabelText('Best Time to Visit', {
        selector: '#spot-best-time-spot-1',
      }),
      { target: { value: 'Morning' } },
    )
    fireEvent.change(
      screen.getByLabelText('Entrance Fee / Access Info', {
        selector: '#spot-fee-spot-1',
      }),
      { target: { value: '₱20' } },
    )
    fireEvent.change(
      screen.getByLabelText('Description', { selector: '#spot-desc-spot-1' }),
      { target: { value: 'Calm waters' } },
    )
    fireEvent.change(
      screen.getByLabelText('Guest Tip', { selector: '#spot-tips-spot-1' }),
      { target: { value: 'Try grilled fish' } },
    )

    // Open Spot 1 Photos Modal
    fireEvent.click(
      screen.getByRole('button', { name: 'Manage photos for spot 1' }),
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Rejects Base64 data URLs and external image URLs inside modal
    const urlInput = screen.getByLabelText('Spot 1 image URL')
    expect(urlInput).toHaveAttribute('type', 'text')
    fireEvent.change(urlInput, {
      target: { value: 'data:image/png;base64,abc' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Add URL/i }))
    expect(onError).toHaveBeenCalledWith(
      expect.stringMatching(/Base64 data URLs cannot be stored/i),
    )

    fireEvent.change(urlInput, {
      target: { value: 'https://external.example.com/santiago.webp' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Add URL/i }))
    expect(onError).toHaveBeenCalledWith(
      expect.stringMatching(/External image URLs are not allowed/i),
    )

    fireEvent.change(urlInput, {
      target: { value: '/api/media/view?key=cms%2Fsantiago.webp' },
    })
    fireEvent.keyDown(urlInput, { key: 'Enter' })
    expect(
      (onSpotsChange.mock.lastCall?.[0] as TouristSpotItem[])[0].images,
    ).toEqual(['/api/media/view?key=cms%2Fsantiago.webp'])

    // Close Spot 1 modal with Escape
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Expand All -> opens Spot 2 as well, then open Spot 2 Photos Modal
    fireEvent.click(screen.getByRole('button', { name: 'Expand All' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Manage photos for spot 2' }),
    )

    // Reorder photo 2 left on spot 2 so it becomes the new Cover
    fireEvent.click(
      screen.getByRole('button', { name: 'Move spot 2 photo 2 left' }),
    )
    expect(
      (onSpotsChange.mock.lastCall?.[0] as TouristSpotItem[])[1].images,
    ).toEqual([
      '/api/media/view?key=cms/bukilat-2.webp',
      '/api/media/view?key=cms/bukilat-1.webp',
    ])

    // Remove photo 1 from spot 2
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove spot 2 photo 1' }),
    )
    expect(
      (onSpotsChange.mock.lastCall?.[0] as TouristSpotItem[])[1].images,
    ).toEqual(['/api/media/view?key=cms/bukilat-1.webp'])

    fireEvent.click(
      screen.getByRole('button', { name: 'Close spot photos modal' }),
    )

    // Collapse All hides expanded panels
    fireEvent.click(screen.getByRole('button', { name: 'Collapse All' }))
    expect(
      screen.queryByLabelText('Destination Name', {
        selector: '#spot-name-spot-1',
      }),
    ).not.toBeInTheDocument()

    // Move spot 1 down, then back up, then delete spot 1 while collapsed
    fireEvent.click(screen.getByRole('button', { name: 'Move spot 1 down' }))
    expect(
      (onSpotsChange.mock.lastCall?.[0] as TouristSpotItem[]).map((s) => s.id),
    ).toEqual(['spot-2', 'spot-1'])

    fireEvent.click(screen.getByRole('button', { name: 'Move spot 2 up' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove spot 1' }))
    expect(
      (onSpotsChange.mock.lastCall?.[0] as TouristSpotItem[]).map((s) => s.id),
    ).toEqual(['spot-2'])
  })

  it('uploads multiple photos per spot in one selection and preserves concurrent edits/reorders', async () => {
    const onError = vi.fn()
    const onUploadingChange = vi.fn()
    const onSpotsChange = vi.fn()

    let resolveFirst!: (value: string) => void
    let resolveSecond!: (value: string) => void
    mockUploadAvatar
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveSecond = resolve
          }),
      )

    render(
      <StatefulEditorHarness
        initialSpots={sampleSpots}
        onError={onError}
        onUploadingChange={onUploadingChange}
        onSpotsChange={onSpotsChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Expand spot 1' }))

    const spot1Input = screen.getByLabelText<HTMLInputElement>(
      'Upload photos for spot 1',
    )

    const file1 = new File(['img1'], 'beach-1.jpg', { type: 'image/jpeg' })
    const file2 = new File(['img2'], 'beach-2.jfif', { type: '' })

    fireEvent.change(spot1Input, { target: { files: [file1, file2] } })

    await waitFor(() => {
      expect(mockUploadAvatar).toHaveBeenCalledTimes(1)
    })

    // While upload is pending, edit spot 1 name AND move spot 1 down
    fireEvent.change(
      screen.getByLabelText('Destination Name', {
        selector: '#spot-name-spot-1',
      }),
      { target: { value: 'Santiago Bay Sunset' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Move spot 1 down' }))

    resolveFirst('/api/media/view?key=cms/beach-1.webp')
    await waitFor(() => {
      expect(mockUploadAvatar).toHaveBeenCalledTimes(2)
    })
    resolveSecond('/api/media/view?key=cms/beach-2.webp')

    await waitFor(() => {
      expect(onUploadingChange).toHaveBeenCalledWith(false)
      const latest = onSpotsChange.mock.lastCall?.[0] as TouristSpotItem[]
      expect(latest.map((s) => s.id)).toEqual(['spot-2', 'spot-1'])
      expect(latest[1]).toEqual(
        expect.objectContaining({
          id: 'spot-1',
          name: 'Santiago Bay Sunset',
          image: '/api/media/view?key=cms/beach-1.webp',
          images: [
            '/api/media/view?key=cms/beach-1.webp',
            '/api/media/view?key=cms/beach-2.webp',
          ],
        }),
      )
    })
  })

  it('validates unsupported file types, keeps earlier successful batch uploads when a later photo fails, and displays inline upload errors', async () => {
    const onError = vi.fn()
    const onUploadingChange = vi.fn()
    const onSpotsChange = vi.fn()

    render(
      <StatefulEditorHarness
        initialSpots={[{ ...sampleSpots[0], name: '' }]}
        onError={onError}
        onUploadingChange={onUploadingChange}
        onSpotsChange={onSpotsChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Expand spot 1' }))

    const fileInput = screen.getByLabelText<HTMLInputElement>(
      'Upload photos for spot 1',
    )

    // Empty file list ignored
    fireEvent.change(fileInput, { target: { files: [] } })
    expect(mockUploadAvatar).not.toHaveBeenCalled()

    // Non-image rejected with inline alert
    const badFile = new File(['hello'], 'doc.pdf', { type: 'application/pdf' })
    fireEvent.change(fileInput, { target: { files: [badFile] } })
    expect(
      screen.getByRole('alert'),
    ).toHaveTextContent(/Please select valid image files/i)

    // Batch upload where photo 1 succeeds and photo 2 fails: photo 1 is kept and error is displayed inline
    mockUploadAvatar
      .mockResolvedValueOnce('/api/media/view?key=cms/kept-photo.webp')
      .mockRejectedValueOnce(new Error('Upload quota exceeded'))
    const validFile1 = new File(['img1'], 'beach1.jpg', { type: 'image/jpeg' })
    const validFile2 = new File(['img2'], 'beach2.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [validFile1, validFile2] } })

    await waitFor(() => {
      expect(mockCompressImage).toHaveBeenCalledWith(validFile1, 1280, 0.82)
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Upload quota exceeded',
      )
      expect(onUploadingChange).toHaveBeenCalledWith(false)
      const latest = onSpotsChange.mock.lastCall?.[0] as TouristSpotItem[]
      expect(latest[0].images).toEqual([
        '/api/media/view?key=cms/kept-photo.webp',
      ])
    })
  })
})
