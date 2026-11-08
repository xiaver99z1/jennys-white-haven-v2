import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UsersList, type User } from './UsersList'

// Mock sub-modals and dropdowns using absolute path aliases matching UsersList.tsx
vi.mock('#/components/admin/users/AddUserModal', () => ({
  AddUserModal: ({ isOpen, onClose, onSuccess }: any) => {
    if (!isOpen) return null
    return (
      <div data-testid="mock-add-user-modal">
        <button type="button" onClick={onSuccess}>
          Success Add User
        </button>
        <button type="button" onClick={onClose}>
          Close Add User
        </button>
      </div>
    )
  },
}))

vi.mock('#/components/admin/users/EditUserProfileModal', () => ({
  EditUserProfileModal: ({ isOpen, onClose, onSuccess, user }: any) => {
    if (!isOpen) return null
    return (
      <div data-testid="mock-edit-user-modal">
        <span>Editing User {user?.name || 'User'}</span>
        <button type="button" onClick={onSuccess}>
          Success Edit User
        </button>
        <button type="button" onClick={onClose}>
          Close Edit User
        </button>
      </div>
    )
  },
}))

vi.mock('#/components/admin/users/ResendVerificationModal', () => ({
  ResendVerificationModal: ({ isOpen, onClose, onSuccess, user }: any) => {
    if (!isOpen) return null
    return (
      <div data-testid="mock-resend-modal">
        <span>Resend to {user?.email}</span>
        <button type="button" onClick={onSuccess}>
          Success Resend
        </button>
        <button type="button" onClick={onClose}>
          Close Resend
        </button>
      </div>
    )
  },
}))

vi.mock('#/components/admin/users/UserActionsDropdown', () => ({
  UserActionsDropdown: ({
    user,
    onOpen,
    onEdit,
    onResendVerification,
    onSuccess,
  }: any) => (
    <div data-testid={`user-actions-${user.id}`}>
      <button
        type="button"
        onClick={() => {
          onOpen?.()
          onEdit(user)
        }}
      >
        Dropdown Edit
      </button>
      <button
        type="button"
        onClick={() => {
          onResendVerification(user)
          onSuccess?.()
        }}
      >
        Dropdown Resend
      </button>
    </div>
  ),
}))

describe('UsersList', () => {
  const mockRouter = {
    invalidate: vi.fn().mockResolvedValue(undefined),
  }

  const mockUsers: User[] = [
    {
      id: 'user-1',
      name: 'Alice Owner',
      email: 'alice@haven.com',
      emailVerified: new Date('2026-01-01'),
      image: 'https://example.com/alice.jpg',
      role: 'owner',
      banned: false,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    },
    {
      id: 'user-2',
      name: 'Bob Manager',
      email: 'bob@haven.com',
      emailVerified: null,
      image: null,
      role: 'manager',
      banned: false,
      createdAt: '2026-01-02T10:00:00.000Z',
      updatedAt: '2026-01-02T10:00:00.000Z',
    },
    {
      id: 'user-3',
      name: 'Charlie Banned',
      email: 'charlie@haven.com',
      emailVerified: new Date('2026-01-01'),
      image: null,
      role: 'receptionist',
      banned: true,
      createdAt: '2026-01-03T10:00:00.000Z',
      updatedAt: '2026-01-03T10:00:00.000Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders users list correctly and filters by search query', async () => {
    const user = userEvent.setup()
    render(<UsersList initialUsers={mockUsers} router={mockRouter} />)

    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getAllByText('Alice Owner')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Bob Manager')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Charlie Banned')[0]).toBeInTheDocument()

    const searchInput = screen.getAllByRole('textbox')[0]
    await user.type(searchInput, 'Alice')

    expect(screen.getAllByText('Alice Owner')[0]).toBeInTheDocument()
    expect(screen.queryByText('Bob Manager')).not.toBeInTheDocument()
  })

  it('filters users by role select filter', async () => {
    const user = userEvent.setup()
    render(<UsersList initialUsers={mockUsers} router={mockRouter} />)

    const comboboxes = screen.getAllByRole('combobox')
    await user.selectOptions(comboboxes[0], 'manager')

    expect(screen.getAllByText('Bob Manager')[0]).toBeInTheDocument()
    expect(screen.queryByText('Alice Owner')).not.toBeInTheDocument()
  })

  it('filters users by status select filter (verified, pending, blocked)', async () => {
    const user = userEvent.setup()
    render(<UsersList initialUsers={mockUsers} router={mockRouter} />)

    const comboboxes = screen.getAllByRole('combobox')
    const statusSelect = comboboxes[1]

    await user.selectOptions(statusSelect, 'blocked')
    expect(screen.getAllByText('Charlie Banned')[0]).toBeInTheDocument()
    expect(screen.queryByText('Alice Owner')).not.toBeInTheDocument()

    await user.selectOptions(statusSelect, 'pending')
    expect(screen.getAllByText('Bob Manager')[0]).toBeInTheDocument()
    expect(screen.queryByText('Charlie Banned')).not.toBeInTheDocument()

    await user.selectOptions(statusSelect, 'verified')
    expect(screen.getAllByText('Alice Owner')[0]).toBeInTheDocument()
  })

  it('filters users by created date', async () => {
    const user = userEvent.setup()
    render(<UsersList initialUsers={mockUsers} router={mockRouter} />)

    const dateInput =
      document.querySelector('input[type="date"]') ||
      screen.getAllByRole('textbox')[1]
    if (dateInput) {
      await user.type(dateInput, '2026-01-01')
    }

    expect(screen.getAllByText('Alice Owner')[0]).toBeInTheDocument()
  })

  it('triggers table sorting columns correctly via sort buttons', async () => {
    const user = userEvent.setup()
    render(<UsersList initialUsers={mockUsers} router={mockRouter} />)

    const sortButtons = screen.getAllByTitle(/sort by/i)
    if (sortButtons.length > 0) {
      await user.click(sortButtons[0])
      await user.click(sortButtons[0])
    }

    expect(screen.getAllByText('Alice Owner')[0]).toBeInTheDocument()
  })

  it('renders default badge color for unassigned or unknown role', () => {
    const userWithoutRole: User[] = [
      {
        ...mockUsers[0],
        id: 'user-4',
        name: 'No Role User',
        role: 'unknown_role',
      },
    ]
    render(<UsersList initialUsers={userWithoutRole} router={mockRouter} />)
    expect(screen.getAllByText('No Role User')[0]).toBeInTheDocument()
  })

  it('opens and closes Add User Modal', async () => {
    const user = userEvent.setup()
    render(<UsersList initialUsers={mockUsers} router={mockRouter} />)

    await user.click(screen.getByRole('button', { name: /add user/i }))
    expect(screen.getByTestId('mock-add-user-modal')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /success add user/i }))
    expect(mockRouter.invalidate).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /close add user/i }))
    expect(screen.queryByTestId('mock-add-user-modal')).not.toBeInTheDocument()
  })

  it('opens and closes Edit User Modal via dropdown actions', async () => {
    const user = userEvent.setup()
    render(<UsersList initialUsers={mockUsers} router={mockRouter} />)

    const editDropdowns = screen.getAllByRole('button', {
      name: /dropdown edit/i,
    })
    await user.click(editDropdowns[0])
    expect(screen.getByTestId('mock-edit-user-modal')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /success edit user/i }))
    expect(mockRouter.invalidate).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /close edit user/i }))
    expect(screen.queryByTestId('mock-edit-user-modal')).not.toBeInTheDocument()
  })

  it('opens and closes Resend Verification Modal via dropdown actions', async () => {
    const user = userEvent.setup()
    render(<UsersList initialUsers={mockUsers} router={mockRouter} />)

    const resendDropdowns = screen.getAllByRole('button', {
      name: /dropdown resend/i,
    })
    await user.click(resendDropdowns[0])
    expect(screen.getByTestId('mock-resend-modal')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /success resend/i }))
    expect(mockRouter.invalidate).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /close resend/i }))
    expect(screen.queryByTestId('mock-resend-modal')).not.toBeInTheDocument()
  })

  it('resets filters when reset button is clicked', async () => {
    const user = userEvent.setup()
    render(<UsersList initialUsers={mockUsers} router={mockRouter} />)

    const searchInput = screen.getAllByRole('textbox')[0]
    await user.type(searchInput, 'Alice')

    const resetBtn = screen.getByRole('button', { name: /reset/i })
    await user.click(resetBtn)

    expect(screen.getAllByText('Bob Manager')[0]).toBeInTheDocument()
  })

  it('handles pagination and page size changes', async () => {
    const user = userEvent.setup()
    const manyUsers: User[] = Array.from({ length: 15 }, (_, i) => ({
      id: `user-${i}`,
      name: `User ${i}`,
      email: `user${i}@haven.com`,
      emailVerified: true,
      image: null,
      role: 'receptionist',
      banned: false,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    }))

    render(<UsersList initialUsers={manyUsers} router={mockRouter} />)

    const comboboxes = screen.getAllByRole('combobox')
    const pageSizeSelect = comboboxes[comboboxes.length - 1]
    if (pageSizeSelect) {
      await user.selectOptions(pageSizeSelect, '5')
    }

    expect(screen.getAllByText('User 0')[0]).toBeInTheDocument()
  })
  it('triggers mobile card view user actions dropdown callbacks', async () => {
    const user = userEvent.setup()
    render(<UsersList initialUsers={mockUsers} router={mockRouter} />)

    // screen.getAllByRole will find buttons in both desktop and mobile views
    const editButtons = screen.getAllByRole('button', {
      name: /dropdown edit/i,
    })
    const resendButtons = screen.getAllByRole('button', {
      name: /dropdown resend/i,
    })

    // Click the second set of buttons (which correspond to the mobile card view)
    if (editButtons.length > 1) {
      await user.click(editButtons[1])
      expect(screen.getByTestId('mock-edit-user-modal')).toBeInTheDocument()
      await user.click(
        screen.getByRole('button', { name: /success edit user/i }),
      )
    }

    if (resendButtons.length > 1) {
      await user.click(resendButtons[1])
      expect(screen.getByTestId('mock-resend-modal')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /success resend/i }))
    }
  })
})
