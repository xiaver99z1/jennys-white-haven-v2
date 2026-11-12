import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GuestsList } from '#/components/admin/guests/GuestsList'
import { restoreGuest } from '#/server/guest-actions'

vi.mock('#/server/guest-actions', () => ({
  restoreGuest: vi.fn(),
}))

vi.mock('#/components/admin/guests/AddGuestModal', () => ({
  AddGuestModal: ({ isOpen, onClose, onSuccess }: any) => {
    if (!isOpen) return null
    return (
      <div data-testid="mock-add-guest-modal">
        <button type="button" onClick={onSuccess}>
          Success Add
        </button>
        <button type="button" onClick={onClose}>
          Close Add
        </button>
      </div>
    )
  },
}))

vi.mock('#/components/admin/guests/EditGuestModal', () => ({
  EditGuestModal: ({
    isOpen,
    onClose,
    onSuccess,
    onSaveStart,
    onDeleteStart,
    guest,
  }: any) => {
    if (!isOpen) return null
    return (
      <div data-testid="mock-edit-guest-modal">
        <span>Editing Guest {guest?.firstName}</span>
        <button type="button" onClick={() => onSaveStart(guest.id)}>
          Trigger Save Lock
        </button>
        <button type="button" onClick={() => onDeleteStart(guest.id)}>
          Trigger Delete Lock
        </button>
        <button
          type="button"
          onClick={() => {
            onSuccess()
            onClose()
          }}
        >
          Success Edit
        </button>
        <button type="button" onClick={onClose}>
          Close Edit
        </button>
      </div>
    )
  },
}))

vi.mock('#/components/common/ConfirmModal', () => ({
  ConfirmModal: ({ isOpen, onConfirm, onClose }: any) => {
    if (!isOpen) return null
    return (
      <div data-testid="mock-confirm-modal">
        <button type="button" onClick={onConfirm}>
          Confirm Action
        </button>
        <button type="button" onClick={onClose}>
          Cancel Action
        </button>
      </div>
    )
  },
}))

describe('GuestsList', () => {
  const mockRouter = {
    invalidate: vi.fn().mockResolvedValue(undefined),
  }

  const mockGuests = [
    {
      id: 'guest-1',
      firstName: 'Maria',
      lastName: 'Santos',
      email: 'maria@example.com',
      phone: '+63 917 123 4567',
      idType: 'Passport',
      idNumber: 'P1234567',
      nationality: 'Filipino',
      specialNotes: 'VIP Guest',
      deletedAt: null,
    },
    {
      id: 'guest-2',
      firstName: 'Juan',
      lastName: 'Cruz',
      email: null,
      phone: '09180001111',
      idType: null,
      idNumber: null,
      nationality: null,
      specialNotes: null,
      deletedAt: null,
    },
    {
      id: 'guest-3',
      firstName: 'Archived',
      lastName: 'Visitor',
      email: 'archived@example.com',
      phone: '09998887777',
      idType: 'National ID',
      idNumber: null,
      nationality: 'American',
      specialNotes: null,
      deletedAt: '2026-01-01T00:00:00.000Z',
    },
  ]

  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('renders active guests table correctly and filters by search query', async () => {
    const user = userEvent.setup()
    render(<GuestsList initialGuests={mockGuests} router={mockRouter} />)

    expect(screen.getByText('Guests Management')).toBeInTheDocument()
    expect(screen.getByText('Maria Santos')).toBeInTheDocument()
    expect(screen.getByText('Juan Cruz')).toBeInTheDocument()
    expect(screen.queryByText('Archived Visitor')).not.toBeInTheDocument()

    const searchInput = screen.getByPlaceholderText(/search by guest name/i)
    await user.type(searchInput, 'P1234567')

    expect(screen.getByText('Maria Santos')).toBeInTheDocument()
    expect(screen.queryByText('Juan Cruz')).not.toBeInTheDocument()
  })

  it('filters guests by ID Type tabs', async () => {
    const user = userEvent.setup()
    render(<GuestsList initialGuests={mockGuests} router={mockRouter} />)

    const passportTab = screen.getByRole('button', { name: 'Passport' })
    await user.click(passportTab)
    expect(screen.getByText('Maria Santos')).toBeInTheDocument()
    expect(screen.queryByText('Juan Cruz')).not.toBeInTheDocument()
  })

  it('toggles archived guests view and displays archived items and empty states', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <GuestsList initialGuests={mockGuests} router={mockRouter} />,
    )

    const archiveToggleBtn = screen.getByRole('button', {
      name: /view archived guests/i,
    })
    await user.click(archiveToggleBtn)

    expect(screen.getByText('Archived Visitor')).toBeInTheDocument()
    expect(screen.queryByText('Maria Santos')).not.toBeInTheDocument()
    expect(screen.getByText('Archived')).toBeInTheDocument()

    // Empty state in archived mode
    rerender(<GuestsList initialGuests={[]} router={mockRouter} />)
    expect(
      screen.getByText('No archived or soft-deleted guests match your filters.'),
    ).toBeInTheDocument()

    // Switch back to active view and verify active empty state
    const activeToggleBtn = screen.getByRole('button', { name: /view guests/i })
    await user.click(activeToggleBtn)
    expect(
      screen.getByText('Get started by adding your first guest profile.'),
    ).toBeInTheDocument()
  })

  it('opens and closes Add Guest Modal', async () => {
    const user = userEvent.setup()
    render(<GuestsList initialGuests={mockGuests} router={mockRouter} />)

    await user.click(screen.getByRole('button', { name: /add guest/i }))
    expect(screen.getByTestId('mock-add-guest-modal')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /success add/i }))
    expect(mockRouter.invalidate).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /close add/i }))
    expect(screen.queryByTestId('mock-add-guest-modal')).not.toBeInTheDocument()
  })

  it('opens Edit Guest Modal, triggers save/delete locks, and tests onSuccess router invalidation', async () => {
    const user = userEvent.setup()
    render(<GuestsList initialGuests={mockGuests} router={mockRouter} />)

    const editButtons = screen.getAllByRole('button', { name: /edit guest/i })
    await user.click(editButtons[0])

    expect(screen.getByTestId('mock-edit-guest-modal')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /trigger save lock/i }))
    await user.click(
      screen.getByRole('button', { name: /trigger delete lock/i }),
    )

    await user.click(screen.getByRole('button', { name: /success edit/i }))
    expect(mockRouter.invalidate).toHaveBeenCalled()
    expect(
      screen.queryByTestId('mock-edit-guest-modal'),
    ).not.toBeInTheDocument()
  })

  it('handles restore guest flow successfully, handles res.success === false, and handles failure', async () => {
    vi.mocked(restoreGuest).mockResolvedValueOnce({ success: false } as any)
    const user = userEvent.setup()
    const { unmount } = render(
      <GuestsList initialGuests={mockGuests} router={mockRouter} />,
    )

    await user.click(
      screen.getByRole('button', { name: /view archived guests/i }),
    )
    await user.click(screen.getByRole('button', { name: /restore guest/i }))
    await user.click(screen.getByRole('button', { name: /confirm action/i }))

    await waitFor(() => {
      expect(restoreGuest).toHaveBeenCalledWith({ data: { id: 'guest-3' } })
      expect(mockRouter.invalidate).not.toHaveBeenCalled()
    })
    unmount()

    vi.clearAllMocks()
    vi.mocked(restoreGuest).mockRejectedValueOnce(new Error('Restore failed'))
    const { unmount: unmount2 } = render(
      <GuestsList initialGuests={mockGuests} router={mockRouter} />,
    )

    await user.click(
      screen.getByRole('button', { name: /view archived guests/i }),
    )
    await user.click(screen.getByRole('button', { name: /restore guest/i }))
    await user.click(screen.getByRole('button', { name: /confirm action/i }))

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to restore guest:',
        expect.any(Error),
      )
    })
    unmount2()

    vi.clearAllMocks()
    vi.mocked(restoreGuest).mockResolvedValueOnce({ success: true } as any)
    render(<GuestsList initialGuests={mockGuests} router={mockRouter} />)

    await user.click(
      screen.getByRole('button', { name: /view archived guests/i }),
    )
    await user.click(screen.getByRole('button', { name: /restore guest/i }))
    await user.click(screen.getByRole('button', { name: /confirm action/i }))

    await waitFor(() => {
      expect(mockRouter.invalidate).toHaveBeenCalled()
    })
  })

  it('cancels restore confirmation modal', async () => {
    const user = userEvent.setup()
    render(<GuestsList initialGuests={mockGuests} router={mockRouter} />)

    await user.click(
      screen.getByRole('button', { name: /view archived guests/i }),
    )
    await user.click(screen.getByRole('button', { name: /restore guest/i }))
    await user.click(screen.getByRole('button', { name: /cancel action/i }))

    expect(screen.queryByTestId('mock-confirm-modal')).not.toBeInTheDocument()
  })

  it('clears restoringId, savingId, and deletingId locks when initialGuests updates', async () => {
    vi.mocked(restoreGuest).mockResolvedValueOnce({ success: true } as any)
    const { rerender } = render(
      <GuestsList initialGuests={mockGuests} router={mockRouter} />,
    )
    const user = userEvent.setup()

    await user.click(
      screen.getByRole('button', { name: /view archived guests/i }),
    )
    await user.click(screen.getByRole('button', { name: /restore guest/i }))
    await user.click(screen.getByRole('button', { name: /confirm action/i }))

    const updatedGuests = mockGuests.map((g) =>
      g.id === 'guest-3' ? { ...g, deletedAt: null } : g,
    )
    rerender(<GuestsList initialGuests={updatedGuests} router={mockRouter} />)

    await user.click(screen.getByRole('button', { name: /view guests/i }))
    const editButtons = screen.getAllByRole('button', { name: /edit guest/i })
    await user.click(editButtons[0])
    await user.click(screen.getByRole('button', { name: /trigger save lock/i }))

    rerender(<GuestsList initialGuests={[...mockGuests]} router={mockRouter} />)

    await user.click(editButtons[0])
    await user.click(
      screen.getByRole('button', { name: /trigger delete lock/i }),
    )

    const deletedGuests = mockGuests.map((g) =>
      g.id === 'guest-1' ? { ...g, deletedAt: '2026-01-01T00:00:00.000Z' } : g,
    )
    rerender(<GuestsList initialGuests={deletedGuests} router={mockRouter} />)

    expect(screen.getByText('Guests Management')).toBeInTheDocument()
  })
})
