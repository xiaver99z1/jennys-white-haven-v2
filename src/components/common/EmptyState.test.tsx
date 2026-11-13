import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { EmptyState } from '#/components/common/EmptyState'

describe('EmptyState', () => {
  it('renders compact message variant', () => {
    render(<EmptyState message="Nothing to display." />)
    expect(screen.getByText('Nothing to display.')).toBeInTheDocument()
  })

  it('renders rich card variant with icon, title, and description', () => {
    render(
      <EmptyState
        icon={<span data-testid="empty-icon">!</span>}
        title="No items found"
        description="Try adjusting your filters."
      />,
    )

    expect(screen.getByTestId('empty-icon')).toBeInTheDocument()
    expect(screen.getByText('No items found')).toBeInTheDocument()
    expect(screen.getByText('Try adjusting your filters.')).toBeInTheDocument()
  })

  it('handles empty props gracefully', () => {
    const { container } = render(<EmptyState />)
    expect(container.firstChild).toBeInTheDocument()
  })
})
