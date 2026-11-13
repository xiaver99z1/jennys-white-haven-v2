import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactNode } from 'react'
import { PublicLayout } from './PublicLayout'
import { DEFAULT_CMS_SECTIONS } from '#/lib/constants/cms'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    className,
    onClick,
  }: {
    to: string
    children: ReactNode
    className?: string
    onClick?: () => void
  }) => (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  ),
}))

describe('PublicLayout', () => {
  const contactSection = DEFAULT_CMS_SECTIONS.find((s) => s.key === 'contact')

  it('renders header navigation, main content, and CMS contact footer', () => {
    render(
      <PublicLayout contactSection={contactSection}>
        <div>Hero Content</div>
      </PublicLayout>,
    )

    expect(screen.getByText('Hero Content')).toBeInTheDocument()
    expect(screen.getByText('Rooms')).toBeInTheDocument()
    expect(screen.getByText('Booking Status')).toBeInTheDocument()
    expect(
      screen.getByText(/Santiago Bay, San Francisco, Camotes Island, Cebu/i),
    ).toBeInTheDocument()
  })

  it('toggles mobile navigation drawer', () => {
    render(
      <PublicLayout contactSection={contactSection}>
        <div>Body</div>
      </PublicLayout>,
    )

    fireEvent.click(
      screen.getByRole('button', { name: /Open navigation menu/i }),
    )
    expect(screen.getByText('Reserve a Stay')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: /Close navigation menu/i }),
    )
    expect(screen.queryByText('Reserve a Stay')).not.toBeInTheDocument()
  })
})
