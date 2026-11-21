import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CmsSettings } from './CmsSettings'
import { DEFAULT_CMS_SECTIONS } from '#/lib/constants/cms'

const {
  mockInvalidate,
  mockUpsertCmsSection,
  mockResetCmsSection,
  mockUploadAvatar,
} = vi.hoisted(() => ({
  mockInvalidate: vi.fn(),
  mockUpsertCmsSection: vi.fn(),
  mockResetCmsSection: vi.fn(),
  mockUploadAvatar: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: mockInvalidate }),
}))

vi.mock('#/server/cms-actions', () => ({
  upsertCmsSection: mockUpsertCmsSection,
  resetCmsSection: mockResetCmsSection,
}))

vi.mock('#/server/upload', () => ({
  uploadAvatar: mockUploadAvatar,
}))

vi.mock('#/lib/image-compress', () => ({
  compressImageForUpload: vi.fn(async (file: File) => file),
  getCmsUploadPreset: vi.fn(() => ({ maxDimension: 1280, quality: 0.82 })),
  IMAGE_UPLOAD_PRESETS: {
    hero: { maxDimension: 1920, quality: 0.82 },
    editorial: { maxDimension: 1280, quality: 0.82 },
  },
}))

describe('CmsSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvalidate.mockResolvedValue(undefined)
  })

  it('renders HeroCarouselEditor for hero and loads other sections into the form', () => {
    render(<CmsSettings initialSections={DEFAULT_CMS_SECTIONS} />)

    expect(screen.getByText('Website Content & Settings')).toBeInTheDocument()
    expect(
      screen.getByLabelText('Interactive hero preview canvas'),
    ).toBeInTheDocument()
    expect(
      screen.queryByLabelText(/Location Eyebrow/i),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Our Sanctuary/i }))
    expect(screen.getByLabelText(/Section Title/i)).toHaveValue(
      DEFAULT_CMS_SECTIONS[1].title,
    )
    expect(screen.getByLabelText(/Section Title/i)).not.toBeRequired()
  })

  it('saves updated section content and invalidates router', async () => {
    mockUpsertCmsSection.mockResolvedValue({
      success: true,
      section: {
        ...DEFAULT_CMS_SECTIONS[1],
        title: 'Updated Sanctuary Story',
      },
    })

    render(<CmsSettings initialSections={DEFAULT_CMS_SECTIONS} />)

    fireEvent.click(screen.getByRole('button', { name: /Our Sanctuary/i }))
    fireEvent.change(screen.getByLabelText(/Section Title/i), {
      target: { value: 'Updated Sanctuary Story' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

    await waitFor(() => {
      expect(mockUpsertCmsSection).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            key: 'story',
            title: 'Updated Sanctuary Story',
          }),
        }),
      )
      expect(mockInvalidate).toHaveBeenCalled()
    })
    expect(screen.getByText(/Our Sanctuary \(Story\) saved/i)).toBeInTheDocument()
  })

  it('adds image by URL and resets a section after confirmation', async () => {
    mockResetCmsSection.mockResolvedValue({
      success: true,
      section: DEFAULT_CMS_SECTIONS[1],
    })

    render(<CmsSettings initialSections={DEFAULT_CMS_SECTIONS} />)

    fireEvent.click(screen.getByRole('button', { name: /Our Sanctuary/i }))
    fireEvent.change(screen.getByPlaceholderText(/paste an image URL/i), {
      target: { value: 'https://example.com/new-beach.jpg' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Add URL/i }))
    expect(
      screen.getByText(/https:\/\/example\.com\/new-beach\.jpg/i),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Reset to Defaults/i }))
    fireEvent.click(screen.getByRole('button', { name: /Reset Section/i }))

    await waitFor(() => {
      expect(mockResetCmsSection).toHaveBeenCalledWith({
        data: { key: 'story' },
      })
    })
  })

  it('disables Reset to Defaults and Save Changes while a hero slide upload is active', async () => {
    let resolveHeroUpload!: (url: string) => void
    mockUploadAvatar.mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          resolveHeroUpload = resolve
        }),
    )

    const { container } = render(
      <CmsSettings initialSections={DEFAULT_CMS_SECTIONS} />,
    )

    const heroFileInput = container.querySelector<HTMLInputElement>(
      'input[type="file"]',
    )!
    const file = new File(['img'], 'slide.jpg', { type: 'image/jpeg' })
    fireEvent.change(heroFileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mockUploadAvatar).toHaveBeenCalledTimes(1)
      expect(
        screen.getByRole('button', { name: /Reset to Defaults/i }),
      ).toBeDisabled()
      expect(
        screen.getByRole('button', { name: /Save Changes/i }),
      ).toBeDisabled()
    })

    resolveHeroUpload('/api/media/view?key=cms/slide.webp')

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Reset to Defaults/i }),
      ).not.toBeDisabled()
    })
  })

  it('renders TouristSpotsEditor, preserves draft spaces/empty names, and saves relative spot image URLs', async () => {
    const exploreDefault = DEFAULT_CMS_SECTIONS.find(
      (s) => s.key === 'explore',
    )!
    mockUpsertCmsSection.mockResolvedValue({
      success: true,
      section: exploreDefault,
    })

    render(<CmsSettings initialSections={DEFAULT_CMS_SECTIONS} />)

    fireEvent.click(screen.getByRole('button', { name: /Explore Camotes/i }))

    expect(
      screen.getByRole('link', { name: /Preview Explore Page/i }),
    ).toHaveAttribute('href', '/explore')
    expect(
      screen.getByText(/Camotes Island Tourist Spots/i),
    ).toBeInTheDocument()

    // Typing trailing spaces and clearing a name must not trim or remove the spot
    const firstSpotName = screen.getByDisplayValue('Santiago Bay White Beach')
    fireEvent.change(firstSpotName, { target: { value: 'Santiago Bay ' } })
    expect(firstSpotName).toHaveValue('Santiago Bay ')

    // Whitespace-only spot name shows validation alert instead of silently dropping spot
    fireEvent.change(firstSpotName, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))
    expect(
      screen.getByText(/Every tourist spot must have a destination name/i),
    ).toBeInTheDocument()
    expect(mockUpsertCmsSection).not.toHaveBeenCalled()

    // Restore valid name + set a relative uploaded photo URL, then save
    fireEvent.change(firstSpotName, { target: { value: 'Santiago Bay Beach' } })
    fireEvent.change(screen.getByLabelText('Spot 1 image URL'), {
      target: { value: '/api/media/view?key=cms%2Fsantiago.webp' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

    await waitFor(() => {
      expect(mockUpsertCmsSection).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            key: 'explore',
          }),
        }),
      )
    })
  })
})
