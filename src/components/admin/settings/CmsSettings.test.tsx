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

describe('CmsSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvalidate.mockResolvedValue(undefined)
  })

  it('renders section tabs and loads the active section into the form', () => {
    render(<CmsSettings initialSections={DEFAULT_CMS_SECTIONS} />)

    expect(screen.getByText('Website Content & Settings')).toBeInTheDocument()
    expect(screen.getByLabelText(/Section Title/i)).toHaveValue(
      DEFAULT_CMS_SECTIONS[0].title,
    )

    fireEvent.click(screen.getByRole('button', { name: /Our Sanctuary/i }))
    expect(screen.getByLabelText(/Section Title/i)).toHaveValue(
      DEFAULT_CMS_SECTIONS[1].title,
    )
  })

  it('saves updated section content and invalidates router', async () => {
    mockUpsertCmsSection.mockResolvedValue({
      success: true,
      section: {
        ...DEFAULT_CMS_SECTIONS[0],
        title: 'Updated Resort Hero',
      },
    })

    render(<CmsSettings initialSections={DEFAULT_CMS_SECTIONS} />)

    fireEvent.change(screen.getByLabelText(/Section Title/i), {
      target: { value: 'Updated Resort Hero' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

    await waitFor(() => {
      expect(mockUpsertCmsSection).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            key: 'hero',
            title: 'Updated Resort Hero',
          }),
        }),
      )
      expect(mockInvalidate).toHaveBeenCalled()
    })
    expect(screen.getByText(/Hero Banner saved/i)).toBeInTheDocument()
  })

  it('adds image by URL and resets a section after confirmation', async () => {
    mockResetCmsSection.mockResolvedValue({
      success: true,
      section: DEFAULT_CMS_SECTIONS[0],
    })

    render(<CmsSettings initialSections={DEFAULT_CMS_SECTIONS} />)

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
        data: { key: 'hero' },
      })
    })
  })
})
