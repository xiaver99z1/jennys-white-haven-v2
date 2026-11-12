import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { AdminNavbar } from './AdminNavbar'

// Mock TanStack Router Link component
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className }: any) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

describe('AdminNavbar', () => {
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
})
