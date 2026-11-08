import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserActivityLogsModal } from './UserActivityLogsModal'
import { getUserActivityLogs } from '#/server/activity-actions'

vi.mock('#/server/activity-actions', () => ({
  getUserActivityLogs: vi.fn(),
}))

vi.mock('#/lib/parse-user-agent', () => ({
  parseUserAgent: (ua: string | null) => ua || 'Chrome on Windows',
}))

describe('UserActivityLogsModal', () => {
  const mockLogs = [
    {
      id: 'log-1',
      action: 'LOGIN',
      description: 'User signed in successfully',
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 Windows',
      createdAt: new Date('2026-10-01T10:00:00Z'),
    },
    {
      id: 'log-2',
      action: 'UPDATE_PROFILE',
      description: 'Updated phone number',
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 Mac',
      createdAt: new Date('2026-10-02T12:30:00Z'),
    },
  ]

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    userId: 'user-123',
    userName: 'Alice Johnson',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <UserActivityLogsModal {...defaultProps} isOpen={false} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('fetches and displays activity logs successfully', async () => {
    vi.mocked(getUserActivityLogs).mockResolvedValueOnce({
      success: true,
      logs: mockLogs,
    } as any)

    render(<UserActivityLogsModal {...defaultProps} />)

    expect(screen.getByText('Activity Audit Log')).toBeInTheDocument()
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()

    await waitFor(() => {
      expect(
        screen.getByText('User signed in successfully'),
      ).toBeInTheDocument()
      expect(screen.getByText('Updated phone number')).toBeInTheDocument()
    })

    expect(getUserActivityLogs).toHaveBeenCalledWith({
      data: { userId: 'user-123' },
    })
  })

  it('displays empty state when no logs exist', async () => {
    vi.mocked(getUserActivityLogs).mockResolvedValueOnce({
      success: true,
      logs: [],
    } as any)

    render(<UserActivityLogsModal {...defaultProps} />)

    await waitFor(() => {
      expect(
        screen.getByText('No activity logs recorded for this user yet.'),
      ).toBeInTheDocument()
    })
  })

  it('filters logs based on search query', async () => {
    const user = userEvent.setup()
    vi.mocked(getUserActivityLogs).mockResolvedValueOnce({
      success: true,
      logs: mockLogs,
    } as any)

    render(<UserActivityLogsModal {...defaultProps} />)

    await waitFor(() => {
      expect(
        screen.getByText('User signed in successfully'),
      ).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(
      /search description, device, date.../i,
    )
    await user.type(searchInput, 'phone number')

    expect(
      screen.queryByText('User signed in successfully'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Updated phone number')).toBeInTheDocument()
  })

  it('filters logs by action dropdown selection', async () => {
    const user = userEvent.setup()
    vi.mocked(getUserActivityLogs).mockResolvedValueOnce({
      success: true,
      logs: mockLogs,
    } as any)

    render(<UserActivityLogsModal {...defaultProps} />)

    await waitFor(() => {
      expect(
        screen.getByText('User signed in successfully'),
      ).toBeInTheDocument()
    })

    const selectDropdown = screen.getByRole('combobox')
    await user.selectOptions(selectDropdown, 'UPDATE_PROFILE')

    expect(
      screen.queryByText('User signed in successfully'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Updated phone number')).toBeInTheDocument()
  })

  it('filters logs by start date range and allows clearing filters', async () => {
    const user = userEvent.setup()
    vi.mocked(getUserActivityLogs).mockResolvedValueOnce({
      success: true,
      logs: mockLogs,
    } as any)

    render(<UserActivityLogsModal {...defaultProps} />)

    await waitFor(() => {
      expect(
        screen.getByText('User signed in successfully'),
      ).toBeInTheDocument()
    })

    const dateInputs = document.querySelectorAll('input[type="datetime-local"]')
    const startDateInput = dateInputs[0] as HTMLInputElement

    fireEvent.change(startDateInput, { target: { value: '2026-10-02T00:00' } })

    expect(
      screen.queryByText('User signed in successfully'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Updated phone number')).toBeInTheDocument()

    const clearBtn = screen.getByText('Clear Filters')
    await user.click(clearBtn)

    expect(screen.getByText('User signed in successfully')).toBeInTheDocument()
  })

  it('filters logs by end date range', async () => {
    vi.mocked(getUserActivityLogs).mockResolvedValueOnce({
      success: true,
      logs: mockLogs,
    } as any)

    render(<UserActivityLogsModal {...defaultProps} />)

    await waitFor(() => {
      expect(
        screen.getByText('User signed in successfully'),
      ).toBeInTheDocument()
    })

    const dateInputs = document.querySelectorAll('input[type="datetime-local"]')
    const endDateInput = dateInputs[1] as HTMLInputElement

    fireEvent.change(endDateInput, { target: { value: '2026-10-01T23:59' } })

    expect(screen.getByText('User signed in successfully')).toBeInTheDocument()
    expect(screen.queryByText('Updated phone number')).not.toBeInTheDocument()
  })

  it('handles pagination controls when multiple pages of logs exist', async () => {
    const user = userEvent.setup()
    const manyLogs = Array.from({ length: 12 }, (_, index) => ({
      id: `log-${index + 1}`,
      action: 'ACTION',
      description: `Description ${index + 1}`,
      ipAddress: '192.168.1.1',
      userAgent: 'Windows',
      createdAt: new Date('2026-10-01T10:00:00Z'),
    }))

    vi.mocked(getUserActivityLogs).mockResolvedValueOnce({
      success: true,
      logs: manyLogs,
    } as any)

    render(<UserActivityLogsModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    })

    const paginationButtons = screen.getAllByRole('button')
    const nextButton = paginationButtons[paginationButtons.length - 2]
    await user.click(nextButton)

    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()

    const prevButton = paginationButtons[paginationButtons.length - 3]
    await user.click(prevButton)

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
  })

  it('handles API error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getUserActivityLogs).mockRejectedValueOnce(
      new Error('API failure'),
    )

    render(<UserActivityLogsModal {...defaultProps} />)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load activity logs:',
        expect.any(Error),
      )
    })

    consoleSpy.mockRestore()
  })

  it('triggers onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(getUserActivityLogs).mockResolvedValueOnce({
      success: true,
      logs: mockLogs,
    } as any)

    render(<UserActivityLogsModal {...defaultProps} />)

    const closeButtons = screen.getAllByRole('button')
    await user.click(closeButtons[0])

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })
})
