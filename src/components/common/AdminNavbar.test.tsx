import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminNavbar } from './AdminNavbar'

const {
  mockGlobalAdminSearch,
  mockGetNotifications,
  mockMarkNotificationRead,
} = vi.hoisted(() => ({
  mockGlobalAdminSearch: vi.fn(),
  mockGetNotifications: vi.fn(),
  mockMarkNotificationRead: vi.fn(),
}))

vi.mock('#/server/navbar-actions', () => ({
  globalAdminSearch: mockGlobalAdminSearch,
}))

vi.mock('#/server/notification-actions', () => ({
  getNotifications: mockGetNotifications,
  markNotificationRead: mockMarkNotificationRead,
}))

// Mock TanStack Router Link component
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className, onClick }: any) => (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  ),
}))

describe('AdminNavbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetNotifications.mockResolvedValue({ unreadCount: 0, items: [] })
    mockMarkNotificationRead.mockResolvedValue({ success: true })
    mockGlobalAdminSearch.mockResolvedValue({
      bookings: [],
      guests: [],
      rooms: [],
    })
  })
  const mockUserWithImage = {
    name: 'John Doe',
    email: 'john@example.com',
    image: 'https://via.placeholder.com/150',
    role: 'owner',
  }

  const mockUserWithoutImage = {
    name: 'Admin User',
    email: 'admin@example.com',
    image: null,
    role: null,
  }

  const defaultProps = {
    user: mockUserWithImage,
    sidebarOpen: false,
    setSidebarOpen: vi.fn(),
    profileMenuOpen: false,
    setProfileMenuOpen: vi.fn(),
    profileMenuRef: { current: null } as any,
    handleLogout: vi.fn(),
  }

  it('renders navbar logo, search input, and action buttons', () => {
    render(<AdminNavbar {...defaultProps} />)

    expect(screen.getByAltText("Jenny's White Haven")).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('Search for anything...'),
    ).toBeInTheDocument()
    expect(screen.getByTitle('Toggle Sidebar')).toBeInTheDocument()
  })

  it('triggers sidebar toggle callback when hamburger button is clicked', async () => {
    const user = userEvent.setup()
    const setSidebarOpen = vi.fn()
    render(
      <AdminNavbar
        {...defaultProps}
        setSidebarOpen={setSidebarOpen}
        sidebarOpen={false}
      />,
    )

    const toggleBtn = screen.getByTitle('Toggle Sidebar')
    await user.click(toggleBtn)

    expect(setSidebarOpen).toHaveBeenCalledWith(true)
  })

  it('renders user image profile avatar when image is provided', () => {
    render(<AdminNavbar {...defaultProps} user={mockUserWithImage} />)

    const avatarImg = screen.getByAltText('John Doe')
    expect(avatarImg).toBeInTheDocument()
    expect(avatarImg).toHaveAttribute('src', mockUserWithImage.image)
  })

  it('renders initial fallback avatar and no role badge when image and role are missing or user is null', () => {
    const { rerender } = render(
      <AdminNavbar
        {...defaultProps}
        user={mockUserWithoutImage}
        profileMenuOpen={true}
      />,
    )

    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    expect(screen.queryByText('owner')).not.toBeInTheDocument()

    rerender(
      <AdminNavbar
        {...defaultProps}
        user={{
          name: '',
          email: '',
          image: 'https://via.placeholder.com/150',
          role: null,
        }}
        profileMenuOpen={true}
      />,
    )
    expect(screen.getByAltText('Admin')).toBeInTheDocument()
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()

    rerender(
      <AdminNavbar {...defaultProps} user={null} profileMenuOpen={true} />,
    )
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
  })

  it('toggles profile popover menu when profile avatar is clicked', async () => {
    const user = userEvent.setup()
    const setProfileMenuOpen = vi.fn()
    render(
      <AdminNavbar
        {...defaultProps}
        profileMenuOpen={false}
        setProfileMenuOpen={setProfileMenuOpen}
      />,
    )

    const profileBtn = screen.getByAltText('John Doe').closest('button')!
    await user.click(profileBtn)

    expect(setProfileMenuOpen).toHaveBeenCalledWith(true)
  })

  it('renders profile dropdown menu items and triggers logout when profileMenuOpen is true', async () => {
    const user = userEvent.setup()
    const handleLogout = vi.fn()
    render(
      <AdminNavbar
        {...defaultProps}
        profileMenuOpen={true}
        handleLogout={handleLogout}
      />,
    )

    expect(screen.getByText('Signed in as')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText(/owner/i)).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()

    const logoutBtn = screen.getByRole('button', { name: /logout/i })
    await user.click(logoutBtn)

    expect(handleLogout).toHaveBeenCalledTimes(1)
  })

  it('handles global search results, empty results, escape, and outside click', async () => {
    const user = userEvent.setup()
    mockGlobalAdminSearch.mockResolvedValueOnce({
      bookings: [
        {
          id: 'b1',
          bookingReference: 'JWH-001',
          guestName: 'Maria Santos',
          roomLabel: 'Room 101 · Ocean',
          status: 'CONFIRMED',
        },
      ],
      guests: [
        {
          id: 'g1',
          name: 'Guest One',
          phone: '0917',
          email: null,
        },
        {
          id: 'g2',
          name: 'Guest Two',
          phone: '0918',
          email: 'guest2@test.com',
        },
      ],
      rooms: [
        {
          id: 'r1',
          roomNumber: '101',
          name: 'Ocean',
          type: 'Deluxe',
          status: 'AVAILABLE',
        },
      ],
    })

    render(<AdminNavbar {...defaultProps} />)

    const searchInput = screen.getByPlaceholderText('Search for anything...')
    await user.type(searchInput, 'Ma')

    await waitFor(() => {
      expect(screen.getByText('JWH-001 · Maria Santos')).toBeInTheDocument()
      expect(screen.getByText('Guest One')).toBeInTheDocument()
      expect(screen.getByText('Room 101 · Ocean')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Guest One'))
    await user.click(searchInput)
    await user.click(screen.getByText('Room 101 · Ocean'))
    await user.click(searchInput)
    await user.click(screen.getByText('JWH-001 · Maria Santos'))
    expect(
      screen.queryByText('JWH-001 · Maria Santos'),
    ).not.toBeInTheDocument()

    mockGlobalAdminSearch.mockRejectedValueOnce(new Error('Search err'))
    await user.clear(searchInput)
    await user.type(searchInput, 'zz')

    await waitFor(() => {
      expect(screen.getByText(/No results found for "zz"/i)).toBeInTheDocument()
    })

    await user.keyboard('{Escape}')
    expect(
      screen.queryByText(/No results found for "zz"/i),
    ).not.toBeInTheDocument()
  })

  it('loads and toggles notifications popover and handles empty state', async () => {
    const user = userEvent.setup()
    mockGetNotifications.mockResolvedValue({
      unreadCount: 1,
      items: [
        {
          id: 'n1',
          type: 'BOOKING_CREATED',
          title: 'Arrival: Maria Santos',
          message: 'JWH-001 · Room 101',
          href: '/admin',
          isRead: false,
          createdAt: '2026-11-13T00:00:00.000Z',
        },
        {
          id: 'n2',
          type: 'PAYMENT_RECORDED',
          title: 'Paid: Maria Santos',
          message: '₱2,500',
          href: '/admin/bookings',
          isRead: true,
          createdAt: '2026-11-13T00:00:00.000Z',
        },
      ],
    })

    render(<AdminNavbar {...defaultProps} />)

    const bellBtn = screen.getByRole('button', { name: 'Notifications' })
    await waitFor(() => {
      expect(bellBtn.querySelector('span')).toBeInTheDocument()
    })

    await user.click(bellBtn)
    expect(screen.getByText('Arrival: Maria Santos')).toBeInTheDocument()
    expect(screen.getByText('See all notifications')).toBeInTheDocument()

    await user.click(screen.getByText('Arrival: Maria Santos'))
    expect(mockMarkNotificationRead).toHaveBeenCalledWith({ data: { id: 'n1' } })
    expect(screen.queryByText('Arrival: Maria Santos')).not.toBeInTheDocument()

    await user.click(bellBtn)
    await user.click(screen.getByText('Paid: Maria Santos'))
    await user.click(bellBtn)
    await user.click(screen.getByText('See all notifications'))
    expect(
      screen.queryByText('See all notifications'),
    ).not.toBeInTheDocument()

    await user.click(bellBtn)
    await user.click(document.body)
    expect(screen.queryByText('Arrival: Maria Santos')).not.toBeInTheDocument()
  })

  it('handles notification fetch failure gracefully and shows caught-up state', async () => {
    const user = userEvent.setup()
    mockGetNotifications.mockRejectedValueOnce(new Error('fail'))

    render(<AdminNavbar {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(screen.getByText(/You're all caught up\./i)).toBeInTheDocument()
  })

  it('ignores async notification and search callbacks after unmount', async () => {
    const user = userEvent.setup()
    let resolveNotifs!: (val: any) => void
    let resolveSearch!: (val: any) => void
    mockGetNotifications.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveNotifs = resolve
        }),
    )
    mockGlobalAdminSearch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSearch = resolve
        }),
    )

    const { unmount } = render(<AdminNavbar {...defaultProps} />)
    await user.type(screen.getByPlaceholderText('Search for anything...'), 'Ma')
    await new Promise((r) => setTimeout(r, 250))
    unmount()

    resolveNotifs({ totalCount: 0, items: [] })
    resolveSearch({ bookings: [], guests: [], rooms: [] })
  })
})
