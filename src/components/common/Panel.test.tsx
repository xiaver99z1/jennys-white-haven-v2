import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Panel } from '#/components/common/Panel'

describe('Panel', () => {
  it('renders title, count badge, action, and children', () => {
    render(
      <Panel
        title="Recent Bookings"
        count={3}
        action={<button type="button">View all</button>}
      >
        <div>Row 1</div>
      </Panel>,
    )

    expect(screen.getByText('Recent Bookings')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('View all')).toBeInTheDocument()
    expect(screen.getByText('Row 1')).toBeInTheDocument()
  })

  it('renders without count badge when count is omitted', () => {
    render(
      <Panel title="Summary">
        <div>Content</div>
      </Panel>,
    )

    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })
})
