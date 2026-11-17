import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { NotFoundPage } from './NotFoundPage'

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

describe('NotFoundPage', () => {
  it('renders public 404 page with Home and Rooms links', () => {
    render(<NotFoundPage />)

    expect(
      screen.getByText(/This shore could not be found\./i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Return Home/i }),
    ).toHaveAttribute('href', '/')
    expect(
      screen.getByRole('link', { name: /Browse Rooms/i }),
    ).toHaveAttribute('href', '/rooms')
  })

  it('renders admin 404 card with Back to Dashboard link', () => {
    render(<NotFoundPage variant="admin" />)

    expect(screen.getByText('Page Not Found')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Back to Dashboard/i }),
    ).toHaveAttribute('href', '/admin')
  })
})
