import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { AdminSidebar } from './AdminSidebar'
import { hasPermission } from '#/lib/permissions'

// Mock TanStack Router Link component
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, inactiveProps, activeProps }: any) => (
    <a href={to} className={inactiveProps?.className || activeProps?.className}>
      {children}
    </a>
  ),
}))

// Mock RBAC permission helper
vi.mock('#/lib/permissions', () => ({
  hasPermission: vi.fn(),
}))

describe('AdminSidebar', () => {
  const mockUserWithPermissions = {
    id: 'user-1',
    role: 'owner',
  }

  const defaultProps = {
    currentUser: mockUserWithPermissions,
    sidebarOpen: true,
    setSidebarOpen: vi.fn(),
    handleLogout: vi.fn(),
  }

  it('renders standard navigation links (Dashboard, Bookings, Rooms, Guests)', () => {
    vi.mocked(hasPermission).mockReturnValue(false)

    render(<AdminSidebar {...defaultProps} />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Bookings')).toBeInTheDocument()
    expect(screen.getByText('Rooms')).toBeInTheDocument()
    expect(screen.getByText('Guests')).toBeInTheDocument()
  })

  it('renders Users navigation item when user has "view:users" permission', () => {
    vi.mocked(hasPermission).mockReturnValue(true)

    render(<AdminSidebar {...defaultProps} />)

    expect(hasPermission).toHaveBeenCalledWith(
      mockUserWithPermissions,
      'view:users',
    )
    expect(screen.getByText('Users')).toBeInTheDocument()
  })

  it('hides Users navigation item when user lacks "view:users" permission', () => {
    vi.mocked(hasPermission).mockReturnValue(false)

    render(<AdminSidebar {...defaultProps} />)

    expect(screen.queryByText('Users')).not.toBeInTheDocument()
  })

  it('toggles Reports submenu items when user has "view:reports" permission', async () => {
    const user = userEvent.setup()
    vi.mocked(hasPermission).mockReturnValue(true)

    render(<AdminSidebar {...defaultProps} />)

    const reportsToggle = screen.getByRole('button', { name: /Reports/i })
    expect(screen.queryByText('Revenue & Payments')).not.toBeInTheDocument()

    await user.click(reportsToggle)
    expect(screen.getByText('Revenue & Payments')).toBeInTheDocument()
    expect(screen.getByText('Occupancy & Rooms')).toBeInTheDocument()
    expect(screen.getByText('Bookings & Ops')).toBeInTheDocument()
    expect(screen.getByText('Guests & Insights')).toBeInTheDocument()
  })

  it('triggers setSidebarOpen(false) when mobile backdrop overlay is clicked', async () => {
    const user = userEvent.setup()
    const setSidebarOpen = vi.fn()

    const { container } = render(
      <AdminSidebar
        {...defaultProps}
        sidebarOpen={true}
        setSidebarOpen={setSidebarOpen}
      />,
    )

    // The mobile backdrop overlay div is rendered when sidebarOpen is true
    const backdrop = container.querySelector('div.fixed.inset-0')!
    expect(backdrop).toBeInTheDocument()

    await user.click(backdrop)
    expect(setSidebarOpen).toHaveBeenCalledWith(false)
  })

  it('does not render mobile backdrop overlay when sidebarOpen is false', () => {
    const { container } = render(
      <AdminSidebar {...defaultProps} sidebarOpen={false} />,
    )

    const backdrop = container.querySelector('div.fixed.inset-0')
    expect(backdrop).not.toBeInTheDocument()
  })

  it('triggers setSidebarOpen(false) when mobile close button is clicked', async () => {
    const user = userEvent.setup()
    const setSidebarOpen = vi.fn()

    render(
      <AdminSidebar
        {...defaultProps}
        sidebarOpen={true}
        setSidebarOpen={setSidebarOpen}
      />,
    )

    // Mobile header button
    const closeBtn = screen.getByText('Navigation').nextElementSibling!
    await user.click(closeBtn)

    expect(setSidebarOpen).toHaveBeenCalledWith(false)
  })

  it('triggers handleLogout callback when Log out button is clicked', async () => {
    const user = userEvent.setup()
    const handleLogout = vi.fn()

    render(<AdminSidebar {...defaultProps} handleLogout={handleLogout} />)

    const logoutBtn = screen.getByRole('button', { name: /log out/i })
    await user.click(logoutBtn)

    expect(handleLogout).toHaveBeenCalledTimes(1)
  })
})
