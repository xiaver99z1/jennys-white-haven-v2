import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatusBadge } from '#/components/common/StatusBadge'

describe('StatusBadge', () => {
  it('renders label, className, and optional icon and uppercase classes', () => {
    render(
      <StatusBadge
        label="Confirmed"
        className="bg-sky-50 text-sky-700"
        icon={<span data-testid="badge-icon">*</span>}
        uppercase
      />,
    )

    const badge = screen.getByText('Confirmed')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-sky-50', 'text-sky-700', 'uppercase', 'text-[11px]')
    expect(screen.getByTestId('badge-icon')).toBeInTheDocument()
  })

  it('supports xs size variant without uppercase', () => {
    render(
      <StatusBadge
        label="Paid"
        size="xs"
        className="bg-emerald-50 text-emerald-700"
      />,
    )

    const badge = screen.getByText('Paid')
    expect(badge).toHaveClass('text-[10px]')
    expect(badge).not.toHaveClass('uppercase')
  })
})
