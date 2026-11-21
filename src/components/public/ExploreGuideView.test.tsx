import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ExploreGuideView } from './ExploreGuideView'
import {
  DEFAULT_CMS_SECTIONS,
  serializeTouristSpots,
} from '#/lib/constants/cms'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    className,
  }: {
    to: string
    children: ReactNode
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

describe('ExploreGuideView', () => {
  const defaultExplore = DEFAULT_CMS_SECTIONS.find((s) => s.key === 'explore')!

  it('renders default Camotes Island tourist spots and filters by category', () => {
    render(<ExploreGuideView exploreSection={defaultExplore} />)

    expect(
      screen.getByRole('heading', { name: 'Explore Camotes Island' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Santiago Bay White Beach')).toBeInTheDocument()
    expect(screen.getByText('Lake Danao Park')).toBeInTheDocument()
    expect(screen.getByText('Bukilat Cave')).toBeInTheDocument()

    // Filter to Cave & Lagoon
    fireEvent.click(screen.getByRole('tab', { name: 'Cave & Lagoon' }))
    expect(screen.getByText('Bukilat Cave')).toBeInTheDocument()
    expect(
      screen.queryByText('Santiago Bay White Beach'),
    ).not.toBeInTheDocument()

    // Switch back to All Spots
    fireEvent.click(screen.getByRole('tab', { name: /All Spots/i }))
    expect(screen.getByText('Santiago Bay White Beach')).toBeInTheDocument()
  })

  it('renders hero image, spot photos, and fallback copy when exploreSection is undefined or empty', () => {
    const customExplore = {
      ...defaultExplore,
      images: ['https://cdn.example.com/camotes-hero.webp'],
      metadata: {
        ...defaultExplore.metadata,
        spotsJson: serializeTouristSpots([
          {
            id: 'custom-beach',
            name: 'Bakhaw White Beach',
            category: 'Beach',
            location: 'Esperanza, San Francisco',
            travelTime: '20 mins',
            bestTime: 'Morning',
            entranceFee: 'Free',
            description: 'Quiet powdery stretch of coast.',
            tips: 'Bring drinking water.',
            image: 'https://cdn.example.com/bakhaw.webp',
          },
        ]),
      },
    }

    const { rerender } = render(
      <ExploreGuideView exploreSection={customExplore} />,
    )

    expect(
      screen.getByAltText('Explore Camotes Island'),
    ).toHaveAttribute('src', 'https://cdn.example.com/camotes-hero.webp')
    expect(screen.getByAltText('Bakhaw White Beach')).toHaveAttribute(
      'src',
      'https://cdn.example.com/bakhaw.webp',
    )
    // Only 1 category -> tablist hidden
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()

    // Empty spots list state
    rerender(
      <ExploreGuideView
        exploreSection={{
          ...defaultExplore,
          title: '',
          ctaLabel: '',
          ctaHref: '',
          metadata: { eyebrow: '', spotsJson: '[]' },
        }}
      />,
    )
    expect(screen.getByText('No destinations listed yet')).toBeInTheDocument()

    // Unpublished or undefined exploreSection hides the default guide cleanly
    rerender(<ExploreGuideView />)
    expect(
      screen.getByRole('heading', { name: /Camotes Island Guide Unavailable/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Santiago Bay White Beach'),
    ).not.toBeInTheDocument()

    rerender(
      <ExploreGuideView
        exploreSection={{ ...defaultExplore, isPublished: false }}
      />,
    )
    expect(
      screen.getByRole('heading', { name: /Camotes Island Guide Unavailable/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Santiago Bay White Beach'),
    ).not.toBeInTheDocument()
  })
})
