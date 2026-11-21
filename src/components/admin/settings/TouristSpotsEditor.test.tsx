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
      }),
    ])
  })

  it('edits spot fields (including spaces and clearing name), reorders, removes photos, and deletes spots', () => {
    const onError = vi.fn()
    const onSpotsChange = vi.fn()

    render(
      <StatefulEditorHarness
        initialSpots={sampleSpots}
        onError={onError}
        onSpotsChange={onSpotsChange}
      />,
    )

    const nameInput = screen.getByLabelText('Destination Name', {
      selector: '#spot-name-spot-1',
    })
    fireEvent.change(nameInput, {
      target: { value: 'Santiago White ' },
    })
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

    // Spot image input uses text type so relative /api/media/view URLs remain valid
    const urlInput = screen.getByLabelText('Spot 1 image URL')
    expect(urlInput).toHaveAttribute('type', 'text')
    fireEvent.change(urlInput, {
      target: { value: '/api/media/view?key=cms%2Fsantiago.webp' },
    })

    // Move spot 1 down, then back up
    fireEvent.click(screen.getByRole('button', { name: 'Move spot 1 down' }))
    expect(
      (onSpotsChange.mock.lastCall?.[0] as TouristSpotItem[]).map((s) => s.id),
    ).toEqual(['spot-2', 'spot-1'])

    fireEvent.click(screen.getByRole('button', { name: 'Move spot 2 up' }))
    expect(
      (onSpotsChange.mock.lastCall?.[0] as TouristSpotItem[]).map((s) => s.id),
    ).toEqual(['spot-1', 'spot-2'])

    // Remove photo on spot 2 (second Remove Photo button)
    const removePhotoButtons = screen.getAllByRole('button', {
      name: 'Remove Photo',
    })
    fireEvent.click(removePhotoButtons[1])
    expect(
      (onSpotsChange.mock.lastCall?.[0] as TouristSpotItem[])[1].image,
    ).toBe('')

    // Remove spot 1
    fireEvent.click(screen.getByRole('button', { name: 'Remove spot 1' }))
    expect(
      (onSpotsChange.mock.lastCall?.[0] as TouristSpotItem[]).map((s) => s.id),
    ).toEqual(['spot-2'])
  })

  it('preserves newer edits and reorders made during an in-flight photo upload and tracks overlapping uploads', async () => {
    const onError = vi.fn()
    const onUploadingChange = vi.fn()
    const onSpotsChange = vi.fn()

    let resolveUpload1!: (value: string) => void
    let resolveUpload2!: (value: string) => void
    mockUploadAvatar
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveUpload1 = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveUpload2 = resolve
          }),
      )

    const { container } = render(
      <StatefulEditorHarness
        initialSpots={sampleSpots}
        onError={onError}
        onUploadingChange={onUploadingChange}
        onSpotsChange={onSpotsChange}
      />,
    )

    const fileInputs = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="file"]'),
    )

    const file1 = new File(['img1'], 'beach.jpg', { type: 'image/jpeg' })
    const file2 = new File(['img2'], 'cave.jpg', { type: 'image/jpeg' })

    // Start overlapping uploads on spot 1 and spot 2
    fireEvent.change(fileInputs[0], { target: { files: [file1] } })
    fireEvent.change(fileInputs[1], { target: { files: [file2] } })

    await waitFor(() => {
      expect(mockUploadAvatar).toHaveBeenCalledTimes(2)
    })

    // While upload 1 is pending, edit spot 1's name AND move spot 1 down to index 1
    fireEvent.change(
      screen.getByLabelText('Destination Name', {
        selector: '#spot-name-spot-1',
      }),
      { target: { value: 'Santiago Bay Sunset' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Move spot 1 down' }))

    // Finish upload 1 while upload 2 is still in flight
    resolveUpload1('/api/media/view?key=cms/santiago.webp')

    await waitFor(() => {
      const latest = onSpotsChange.mock.lastCall?.[0] as TouristSpotItem[]
      expect(latest.map((s) => s.id)).toEqual(['spot-2', 'spot-1'])
      expect(latest[1]).toEqual(
        expect.objectContaining({
          id: 'spot-1',
          name: 'Santiago Bay Sunset',
          image: '/api/media/view?key=cms/santiago.webp',
        }),
      )
    })

    // Controls must NOT report idle yet because upload 2 is still active
    expect(onUploadingChange).not.toHaveBeenCalledWith(false)

    // Finish upload 2 -> now uploading transitions to false
    resolveUpload2('/api/media/view?key=cms/bukilat.webp')

    await waitFor(() => {
      expect(onUploadingChange).toHaveBeenCalledWith(false)
      const latest = onSpotsChange.mock.lastCall?.[0] as TouristSpotItem[]
      expect(latest[0]).toEqual(
        expect.objectContaining({
          id: 'spot-2',
          image: '/api/media/view?key=cms/bukilat.webp',
        }),
      )
    })
  })

  it('validates file types and handles upload errors gracefully', async () => {
    const onError = vi.fn()
    const onUploadingChange = vi.fn()

    const { container } = render(
      <StatefulEditorHarness
        initialSpots={[{ ...sampleSpots[0], name: '' }]}
        onError={onError}
        onUploadingChange={onUploadingChange}
      />,
    )

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

    // Upload error handled gracefully
    mockUploadAvatar.mockRejectedValueOnce(new Error('Upload quota exceeded'))
    const validFile = new File(['img'], 'beach.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [validFile] } })

    await waitFor(() => {
      expect(mockCompressImage).toHaveBeenCalledWith(validFile, 1280, 0.82)
      expect(onError).toHaveBeenCalledWith('Upload quota exceeded')
      expect(onUploadingChange).toHaveBeenCalledWith(false)
    })
  })
})
