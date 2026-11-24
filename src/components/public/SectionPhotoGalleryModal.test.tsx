// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SectionPhotoGalleryModal } from './SectionPhotoGalleryModal'

const samplePhotos = [
  { url: 'https://example.com/photo-1.webp', caption: 'Primary bedroom' },
  { url: 'https://example.com/photo-2.webp', caption: 'Living area' },
  { url: 'https://example.com/photo-3.webp', caption: 'Primary bathroom' },
]

describe('SectionPhotoGalleryModal', () => {
  it('renders the Pictures grid with photo captions and opens the full-screen lightbox when a picture is clicked', () => {
    const onClose = vi.fn()
    render(
      <SectionPhotoGalleryModal
        isOpen={true}
        sectionTitle="The Sanctuary"
        sectionEyebrow="The Sanctuary"
        photos={samplePhotos}
        onClose={onClose}
      />,
    )

    // Stage 1: Pictures Grid (Image 3)
    expect(screen.getByText('Pictures')).toBeTruthy()
    expect(screen.getByText('Primary bedroom')).toBeTruthy()
    expect(screen.getByText('Living area')).toBeTruthy()
    expect(screen.getByText('Primary bathroom')).toBeTruthy()

    // Click the 2nd picture ("Living area") -> opens Stage 2 Lightbox (Image 4)
    fireEvent.click(
      screen.getByRole('button', { name: 'Open photo 2: Living area' }),
    )

    expect(screen.getByText('2 / 3')).toBeTruthy()
    expect(screen.getByText('Living area')).toBeTruthy()

    // Navigate to next photo in lightbox
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }))
    expect(screen.getByText('3 / 3')).toBeTruthy()
    expect(screen.getByText('Primary bathroom')).toBeTruthy()

    // Click thumbnail 1 in the bottom strip
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Select photo 1: Primary bedroom',
      }),
    )
    expect(screen.getByText('1 / 3')).toBeTruthy()

    // Return to All Pictures grid
    fireEvent.click(screen.getByRole('button', { name: /All Pictures/i }))
    expect(screen.getByText('Pictures')).toBeTruthy()
  })
})
