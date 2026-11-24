// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GalleryPageView } from './GalleryPageView'
import type { CmsSectionData } from '#/types'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...rest }: any) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))

const sampleGallerySection: CmsSectionData = {
  key: 'gallery',
  title: 'Spaces bathed in tropical light.',
  subtitle: 'A glimpse into daily life at the haven.',
  body: '',
  ctaLabel: '',
  ctaHref: '',
  images: [
    'https://example.com/living.webp',
    'https://example.com/dining.webp',
    'https://example.com/bedroom.webp',
  ],
  metadata: {
    eyebrow: 'Atmosphere',
    imageCaptionsJson: JSON.stringify(['Living Room', 'Dining Area', 'Suite']),
  },
  isPublished: true,
  sortOrder: 4,
}

describe('GalleryPageView', () => {
  it('renders the Pictures grid with captions and opens the lightbox on photo click or Explore all pictures click', () => {
    render(<GalleryPageView gallerySection={sampleGallerySection} />)

    expect(screen.getByText('Spaces bathed in tropical light.')).toBeTruthy()
    expect(screen.getByText('Pictures')).toBeTruthy()
    expect(screen.getByText('Living Room')).toBeTruthy()
    expect(screen.getByText('Dining Area')).toBeTruthy()
    expect(screen.getByText('Suite')).toBeTruthy()

    // Clicking photo #2 opens lightbox at 2 / 3
    fireEvent.click(
      screen.getByRole('button', { name: 'Open photo 2: Dining Area' }),
    )
    expect(screen.getByText('2 / 3')).toBeTruthy()

    // Close lightbox
    fireEvent.click(
      screen.getByRole('button', { name: 'Close photo viewer' }),
    )

    // Clicking "Explore all pictures" opens lightbox at 1 / 3
    fireEvent.click(
      screen.getByRole('button', { name: 'Explore all pictures' }),
    )
    expect(screen.getByText('1 / 3')).toBeTruthy()
  })
})
