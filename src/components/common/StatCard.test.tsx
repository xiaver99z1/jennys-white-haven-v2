import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatCard } from '#/components/common/StatCard'

describe('StatCard', () => {
  it('renders title, value, hint, icon, and custom accent', () => {
    render(
      <StatCard
        title="Revenue"
        value="₱12,500"
        hint="This month"
        accent="bg-emerald-50 text-emerald-700"
        icon={<span data-testid="stat-icon">$</span>}
      />,
    )

    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('₱12,500')).toBeInTheDocument()
    expect(screen.getByText('This month')).toBeInTheDocument()
    expect(screen.getByTestId('stat-icon')).toBeInTheDocument()
  })

  it('omits hint when not provided and uses default accent', () => {
    render(
      <StatCard
        title="Rooms"
        value="8"
        icon={<span>R</span>}
      />,
    )

    expect(screen.getByText('Rooms')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })
})
