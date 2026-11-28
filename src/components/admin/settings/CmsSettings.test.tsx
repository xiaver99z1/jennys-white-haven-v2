import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react'
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
  isSupportedImageFile: vi.fn((file: File) => file.type.startsWith('image/')),
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

  it('renders HeroCarouselEditor for hero, hides any legacy hero title in the sidebar, and loads other sections into the form', () => {
    const sectionsWithLegacyHeroTitle = DEFAULT_CMS_SECTIONS.map((s) =>
      s.key === 'hero' ? { ...s, title: 'J' } : s,
    )
    render(<CmsSettings initialSections={sectionsWithLegacyHeroTitle} />)

    expect(screen.getByText('Website Content & Settings')).toBeInTheDocument()
    const heroSidebarBtn = screen.getByRole('button', { name: /Hero Banner/i })
    expect(within(heroSidebarBtn).queryByText('J')).not.toBeInTheDocument()
    expect(
      screen.getByLabelText('Interactive hero preview canvas'),
    ).toBeInTheDocument()
    expect(
      screen.queryByLabelText(/Location Eyebrow/i),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Our Sanctuary/i }))
    expect(screen.getByLabelText(/Section Eyebrow/i)).toHaveValue(
      DEFAULT_CMS_SECTIONS[1].metadata.eyebrow,
    )

    fireEvent.click(screen.getByRole('button', { name: /Rooms Showcase/i }))
    expect(screen.getByLabelText(/Section Title/i)).toHaveValue(
      DEFAULT_CMS_SECTIONS[2].title,
    )
    expect(screen.getByLabelText(/Section Title/i)).not.toBeRequired()
  })

  it('saves updated section content and invalidates router', async () => {
    mockUpsertCmsSection.mockResolvedValue({
      success: true,
      section: {
        ...DEFAULT_CMS_SECTIONS[2],
        title: 'Updated Rooms Showcase',
      },
    })

    render(<CmsSettings initialSections={DEFAULT_CMS_SECTIONS} />)

    fireEvent.click(screen.getByRole('button', { name: /Rooms Showcase/i }))
    fireEvent.change(screen.getByLabelText(/Section Title/i), {
      target: { value: 'Updated Rooms Showcase' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

    await waitFor(() => {
      expect(mockUpsertCmsSection).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            key: 'rooms',
            title: 'Updated Rooms Showcase',
          }),
        }),
      )
      expect(mockInvalidate).toHaveBeenCalled()
    })
    expect(screen.getByText(/Rooms Showcase saved/i)).toBeInTheDocument()
  })

  it('renders BrandLogosEditor when Brand Logos section is selected', () => {
    render(<CmsSettings initialSections={DEFAULT_CMS_SECTIONS} />)

    fireEvent.click(screen.getByRole('button', { name: /Brand Logos/i }))
    expect(
      screen.getByText('Admin Navbar & Favicon Icon'),
    ).toBeInTheDocument()
    expect(screen.getByText('Admin Login & Auth Logo')).toBeInTheDocument()
    expect(
      screen.getByText('Public Website Header & Footer Logo'),
    ).toBeInTheDocument()
  })

  it('toggles the desktop Public Site Sections menu to expand the editor to full width', () => {
    const { container } = render(
      <CmsSettings initialSections={DEFAULT_CMS_SECTIONS} />,
    )

    const sidebar = container.querySelector('#cms-sections-sidebar')!
    const form = container.querySelector('form')!
    const previewLink = screen.getByRole('link', {
      name: /Preview Public Site/i,
    })
    const hideBtn = screen.getByRole('button', { name: /Hide Menu/i })

    expect(hideBtn.parentElement).toContainElement(previewLink)
    expect(
      within(form).queryByRole('button', { name: /Hide Menu/i }),
    ).not.toBeInTheDocument()
    expect(sidebar.className).toContain('lg:col-span-4')
    expect(form.className).toContain('lg:col-span-8')

    fireEvent.click(hideBtn)
    expect(sidebar.className).toContain('lg:hidden')
    expect(form.className).toContain('lg:col-span-12')

    fireEvent.click(screen.getByRole('button', { name: /Show Menu/i }))
    expect(sidebar.className).toContain('lg:col-span-4')
    expect(form.className).toContain('lg:col-span-8')
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

    // Expand Spot 1 accordion to edit its fields
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Expand spot 1: Santiago Bay White Beach',
      }),
    )

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

    // Restore valid name + open Spot 1 photos modal to add a relative uploaded photo URL, then save
    fireEvent.change(firstSpotName, { target: { value: 'Santiago Bay Beach' } })
    fireEvent.click(
      screen.getByRole('button', { name: 'Manage photos for spot 1' }),
    )
    fireEvent.change(screen.getByLabelText('Spot 1 image URL'), {
      target: { value: '/api/media/view?key=cms%2Fsantiago.webp' },
    })
    fireEvent.click(screen.getAllByRole('button', { name: /Add URL/i })[0])
    fireEvent.click(
      screen.getByRole('button', { name: 'Close spot photos modal' }),
    )

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
