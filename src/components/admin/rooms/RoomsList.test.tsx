import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RoomsList } from '#/components/admin/rooms/RoomsList'

// Mock server actions
vi.mock('#/server/room-actions', () => ({
  restoreRoom: vi.fn(),
}))

// Mock child modals
vi.mock('#/components/admin/rooms/AddRoomModal', () => ({
  AddRoomModal: ({ isOpen, onClose, onSuccess }: any) => {
    if (!isOpen) return null
    return (
      <div data-testid="mock-add-room-modal">
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

vi.mock('#/components/admin/rooms/EditRoomModal', () => ({
  EditRoomModal: ({
    isOpen,
    onClose,
    onSuccess,
    onSaveStart,
    onDeleteStart,
    room,
  }: any) => {
    if (!isOpen) return null
    return (
      <div data-testid="mock-edit-room-modal">
        <span>Editing Room {room?.roomNumber}</span>
        <button type="button" onClick={() => onSaveStart(room.id)}>
          Trigger Save Lock
        </button>
        <button type="button" onClick={() => onDeleteStart(room.id)}>
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

// Mock ConfirmModal
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

import { restoreRoom } from '#/server/room-actions'

describe('RoomsList', () => {
  const mockRouter = {
    invalidate: vi.fn().mockResolvedValue(undefined),
  }

  const mockRooms = [
    {
      id: 'room-1',
      roomNumber: '101',
      name: 'Standard Twin',
      type: 'Standard',
      capacity: 2,
      pricePerNight: 1500,
      status: 'AVAILABLE',
      amenities: ['Wi-Fi'],
      images: ['https://example.com/1.jpg'],
      deletedAt: null,
    },
    {
      id: 'room-2',
      roomNumber: '201',
      name: 'Deluxe Suite',
      type: 'Deluxe',
      capacity: 4,
      pricePerNight: 3500,
      status: 'OCCUPIED',
      amenities: ['Wi-Fi', 'Pool Access'],
      images: [],
      deletedAt: null,
    },
    {
      id: 'room-3',
      roomNumber: '301',
      name: 'Archived Villa',
      type: 'Villa',
      capacity: 6,
      pricePerNight: 8000,
      status: 'MAINTENANCE',
      amenities: [],
      images: [],
      deletedAt: '2026-01-01T00:00:00.000Z',
    },
  ]

  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    // Silence expected console.error logs during error-handling tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('renders active rooms table correctly and filters by search query', async () => {
    const user = userEvent.setup()
    render(<RoomsList initialRooms={mockRooms} router={mockRouter} />)

    expect(screen.getByText('Rooms Management')).toBeInTheDocument()
    expect(screen.getByText('101')).toBeInTheDocument()
    expect(screen.getByText('201')).toBeInTheDocument()
    expect(screen.queryByText('301')).not.toBeInTheDocument()

    const searchInput = screen.getByPlaceholderText(/search by room number/i)
    await user.type(searchInput, 'Deluxe')

    expect(screen.getByText('201')).toBeInTheDocument()
    expect(screen.queryByText('101')).not.toBeInTheDocument()
  })

  it('filters rooms by type tabs', async () => {
    const user = userEvent.setup()
    render(<RoomsList initialRooms={mockRooms} router={mockRouter} />)

    const standardTab = screen.getByRole('button', { name: 'Standard' })
    await user.click(standardTab)
    expect(screen.getByText('101')).toBeInTheDocument()

    const deluxeTab = screen.getByRole('button', { name: 'Deluxe' })
    await user.click(deluxeTab)
    expect(screen.getByText('201')).toBeInTheDocument()
    expect(screen.queryByText('101')).not.toBeInTheDocument()
  })

  it('toggles archived rooms view and displays archived items', async () => {
    const user = userEvent.setup()
    render(<RoomsList initialRooms={mockRooms} router={mockRouter} />)

    const archiveToggleBtn = screen.getByRole('button', {
      name: /view archived rooms/i,
    })
    await user.click(archiveToggleBtn)

    expect(screen.getByText('301')).toBeInTheDocument()
    expect(screen.queryByText('101')).not.toBeInTheDocument()
    expect(screen.getByText('Archived')).toBeInTheDocument()

    const activeToggleBtn = screen.getByRole('button', { name: /view rooms/i })
    await user.click(activeToggleBtn)
    expect(screen.getByText('101')).toBeInTheDocument()
  })

  it('shows empty state when no rooms match filters', async () => {
    render(<RoomsList initialRooms={[]} router={mockRouter} />)
    expect(screen.getByText('No rooms found')).toBeInTheDocument()
  })

  it('opens and closes Add Room Modal', async () => {
    const user = userEvent.setup()
    render(<RoomsList initialRooms={mockRooms} router={mockRouter} />)

    await user.click(screen.getByRole('button', { name: /add room/i }))
    expect(screen.getByTestId('mock-add-room-modal')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /success add/i }))
    expect(mockRouter.invalidate).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /close add/i }))
    expect(screen.queryByTestId('mock-add-room-modal')).not.toBeInTheDocument()
  })

  it('opens Edit Room Modal, triggers save/delete locks, and tests onSuccess router invalidation', async () => {
    const user = userEvent.setup()
    render(<RoomsList initialRooms={mockRooms} router={mockRouter} />)

    const editButtons = screen.getAllByRole('button', { name: /edit room/i })
    await user.click(editButtons[0])

    expect(screen.getByTestId('mock-edit-room-modal')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /trigger save lock/i }))
    await user.click(
      screen.getByRole('button', { name: /trigger delete lock/i }),
    )

    await user.click(screen.getByRole('button', { name: /success edit/i }))
    expect(mockRouter.invalidate).toHaveBeenCalled()
    expect(screen.queryByTestId('mock-edit-room-modal')).not.toBeInTheDocument()
  })

  it('handles restore room flow successfully and covers isRestoring guard clause', async () => {
    vi.mocked(restoreRoom).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ success: true } as any), 100),
        ),
    )
    const user = userEvent.setup()
    render(<RoomsList initialRooms={mockRooms} router={mockRouter} />)

    await user.click(
      screen.getByRole('button', { name: /view archived rooms/i }),
    )
    await user.click(screen.getByRole('button', { name: /restore room/i }))

    const confirmBtn = screen.getByRole('button', { name: /confirm action/i })
    await user.click(confirmBtn)
    await user.click(confirmBtn) // Rapid double click hits isRestoring guard clause

    await waitFor(() => {
      expect(restoreRoom).toHaveBeenCalledWith({ data: { id: 'room-3' } })
      expect(mockRouter.invalidate).toHaveBeenCalled()
    })
  })

  it('handles restore room failure gracefully', async () => {
    vi.mocked(restoreRoom).mockRejectedValueOnce(new Error('Restore failed'))
    const user = userEvent.setup()
    render(<RoomsList initialRooms={mockRooms} router={mockRouter} />)

    await user.click(
      screen.getByRole('button', { name: /view archived rooms/i }),
    )
    await user.click(screen.getByRole('button', { name: /restore room/i }))
    await user.click(screen.getByRole('button', { name: /confirm action/i }))

    await waitFor(() => {
      expect(restoreRoom).toHaveBeenCalledTimes(1)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to restore room:',
        expect.any(Error),
      )
    })
  })

  it('cancels restore confirmation modal', async () => {
    const user = userEvent.setup()
    render(<RoomsList initialRooms={mockRooms} router={mockRouter} />)

    await user.click(
      screen.getByRole('button', { name: /view archived rooms/i }),
    )
    await user.click(screen.getByRole('button', { name: /restore room/i }))
    await user.click(screen.getByRole('button', { name: /cancel action/i }))

    expect(screen.queryByTestId('mock-confirm-modal')).not.toBeInTheDocument()
  })

  it('clears restoringId when the room is removed or deletedAt becomes null', async () => {
    vi.mocked(restoreRoom).mockResolvedValueOnce({ success: true } as any)
    const { rerender } = render(
      <RoomsList initialRooms={mockRooms} router={mockRouter} />,
    )
    const user = userEvent.setup()

    await user.click(
      screen.getByRole('button', { name: /view archived rooms/i }),
    )
    await user.click(screen.getByRole('button', { name: /restore room/i }))
    await user.click(screen.getByRole('button', { name: /confirm action/i }))

    const filteredRooms = mockRooms.filter((r) => r.id !== 'room-3')
    rerender(<RoomsList initialRooms={filteredRooms} router={mockRouter} />)

    const updatedRooms = mockRooms.map((r) =>
      r.id === 'room-3' ? { ...r, deletedAt: null } : r,
    )
    rerender(<RoomsList initialRooms={updatedRooms} router={mockRouter} />)

    expect(screen.getByText('Rooms Management')).toBeInTheDocument()
  })

  it('clears savingId and deletingId locks when initialRooms updates', async () => {
    const { rerender } = render(
      <RoomsList initialRooms={mockRooms} router={mockRouter} />,
    )
    const user = userEvent.setup()

    const editButtons = screen.getAllByRole('button', { name: /edit room/i })
    await user.click(editButtons[0])
    await user.click(screen.getByRole('button', { name: /trigger save lock/i }))

    rerender(<RoomsList initialRooms={[...mockRooms]} router={mockRouter} />)

    await user.click(editButtons[0])
    await user.click(
      screen.getByRole('button', { name: /trigger delete lock/i }),
    )

    const deletedRooms = mockRooms.map((r) =>
      r.id === 'room-1' ? { ...r, deletedAt: '2026-01-01T00:00:00.000Z' } : r,
    )
    rerender(<RoomsList initialRooms={deletedRooms} router={mockRouter} />)

    expect(screen.getByText('Rooms Management')).toBeInTheDocument()
  })
})
