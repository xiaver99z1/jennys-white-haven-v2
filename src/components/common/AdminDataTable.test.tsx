import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { AdminDataTable, type Column } from './AdminDataTable'

type TestItem = {
  id: string
  name: string
  role: string
  createdAt: string
}

describe('AdminDataTable', () => {
  const mockColumns: Column<TestItem>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      filterable: true,
      filterType: 'text',
      renderCell: (item) => <span>{item.name}</span>,
      renderMobileCard: (item) => <div key={item.id}>Mobile - {item.name}</div>,
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'All', value: 'ALL' },
        { label: 'Admin', value: 'admin' },
      ],
      renderCell: (item) => <span>{item.role}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created Date',
      sortable: true,
      filterable: true,
      filterType: 'date',
      renderCell: (item) => <span>{item.createdAt}</span>,
    },
  ]

  const mockData: TestItem[] = [
    { id: '1', name: 'Alice', role: 'admin', createdAt: '2026-01-01' },
    { id: '2', name: 'Bob', role: 'user', createdAt: '2026-01-02' },
  ]

  const defaultProps = {
    data: mockData,
    columns: mockColumns,
    keyField: 'id' as keyof TestItem,
    sortField: 'name',
    sortOrder: 'asc' as const,
    onSort: vi.fn(),
    searchValues: { name: '', role: 'ALL', createdAt: '' },
    onSearchChange: vi.fn(),
    onResetFilters: vi.fn(),
    currentPage: 1,
    pageSize: 10,
    totalItems: 2,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    title: 'Test Table',
  }

  it('renders table title, columns, and data rows correctly', () => {
    render(<AdminDataTable {...defaultProps} />)

    expect(
      screen.getByRole('heading', { name: 'Test Table' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Alice')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Bob')[0]).toBeInTheDocument()
  })

  it('renders add button and triggers onAddClick when provided', async () => {
    const user = userEvent.setup()
    const handleAddClick = vi.fn()
    render(
      <AdminDataTable
        {...defaultProps}
        addLabel="Add Record"
        onAddClick={handleAddClick}
      />,
    )

    const addButton = screen.getByRole('button', { name: /add record/i })
    expect(addButton).toBeInTheDocument()

    await user.click(addButton)
    expect(handleAddClick).toHaveBeenCalledTimes(1)
  })

  it('toggles mobile filter drawer and exercises filters, sorting inputs, and reset', async () => {
    const user = userEvent.setup()
    render(<AdminDataTable {...defaultProps} />)

    const toggleButton = screen.getByTitle('Toggle Filters')
    await user.click(toggleButton)

    expect(screen.getByText('Filter & Sort Options')).toBeInTheDocument()

    const selects = screen.getAllByRole('combobox')
    const mobileSelect = selects[0]
    await user.selectOptions(mobileSelect, 'admin')
    expect(defaultProps.onSearchChange).toHaveBeenCalledWith('role', 'admin')

    const mobileSortSelect = selects[1]
    await user.selectOptions(mobileSortSelect, 'role')
    expect(defaultProps.onSort).toHaveBeenCalledWith('role')

    const dateInput = document.querySelector('input[type="date"]')
    if (dateInput) {
      await user.type(dateInput, '2026-01-01')
      expect(defaultProps.onSearchChange).toHaveBeenCalled()
    }

    const resetBtn = screen.getByRole('button', { name: /reset all/i })
    await user.click(resetBtn)
    expect(defaultProps.onResetFilters).toHaveBeenCalledTimes(1)

    const applyBtn = screen.getByRole('button', { name: /apply/i })
    await user.click(applyBtn)
  })

  it('toggles desktop column filter input when filter button is clicked', async () => {
    const user = userEvent.setup()
    render(<AdminDataTable {...defaultProps} />)

    const filterBtn = screen.getByTitle('Filter Name')
    await user.click(filterBtn)

    const searchInput = screen.getByPlaceholderText('Name...')
    expect(searchInput).toBeInTheDocument()

    await user.type(searchInput, 'Alice')
    expect(defaultProps.onSearchChange).toHaveBeenCalled()

    const clearBtn = screen.getByTitle('Clear & Close Filter')
    await user.click(clearBtn)
  })

  it('triggers sorting callback when desktop sort header button is clicked', async () => {
    const user = userEvent.setup()
    const handleSort = vi.fn()
    render(<AdminDataTable {...defaultProps} onSort={handleSort} />)

    const sortBtn = screen.getByTitle('Sort by Name')
    await user.click(sortBtn)

    expect(handleSort).toHaveBeenCalledWith('name')
  })

  it('renders empty state message when data array is empty', () => {
    render(<AdminDataTable {...defaultProps} data={[]} totalItems={0} />)

    expect(
      screen.getByText(/no records found matching your criteria/i),
    ).toBeInTheDocument()
  })

  it('handles pagination navigation and page size changes', async () => {
    const user = userEvent.setup()
    const handlePageChange = vi.fn()
    const handlePageSizeChange = vi.fn()

    render(
      <AdminDataTable
        {...defaultProps}
        totalItems={25}
        pageSize={10}
        currentPage={2}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />,
    )

    expect(screen.getByText(/showing/i)).toBeInTheDocument()

    const prevButton = screen.getByRole('button', { name: /previous/i })
    await user.click(prevButton)
    expect(handlePageChange).toHaveBeenCalled()

    const nextButton = screen.getByRole('button', { name: /next/i })
    await user.click(nextButton)
    expect(handlePageChange).toHaveBeenCalled()

    const comboboxes = screen.getAllByRole('combobox')
    const pageSizeSelect = comboboxes[comboboxes.length - 1]
    await user.selectOptions(pageSizeSelect, '20')
    expect(handlePageSizeChange).toHaveBeenCalledWith(20)
  })

  it('triggers search change on mobile text input filter', async () => {
    const user = userEvent.setup()
    const handleSearchChange = vi.fn()
    render(
      <AdminDataTable {...defaultProps} onSearchChange={handleSearchChange} />,
    )

    const toggleButton = screen.getByTitle('Toggle Filters')
    await user.click(toggleButton)

    const textInput = screen.getByPlaceholderText(/search name.../i)
    await user.type(textInput, 'A')

    expect(handleSearchChange).toHaveBeenCalledWith('name', 'A')
  })
  it('toggles and exercises desktop select and date column filters', async () => {
    const user = userEvent.setup()
    render(<AdminDataTable {...defaultProps} />)

    // 1. Test Desktop Select Filter (Role column)
    const roleFilterBtn = screen.getByTitle('Filter Role')
    await user.click(roleFilterBtn)

    // Query select specifically inside the table header (thead)
    const desktopSelect = document.querySelector(
      'thead select',
    ) as HTMLSelectElement
    if (desktopSelect) {
      await user.selectOptions(desktopSelect, 'admin')
      expect(defaultProps.onSearchChange).toHaveBeenCalledWith('role', 'admin')
    }

    // 2. Test Desktop Date Filter (Created Date column)
    const dateFilterBtn = screen.getByTitle('Filter Created Date')
    await user.click(dateFilterBtn)

    const dateInput = document.querySelector(
      'thead input[type="date"]',
    ) as HTMLInputElement
    if (dateInput) {
      await user.type(dateInput, '2026-01-01')
      expect(defaultProps.onSearchChange).toHaveBeenCalled()
    }
  })
})
