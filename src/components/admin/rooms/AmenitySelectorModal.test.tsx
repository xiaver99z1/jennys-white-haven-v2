import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AmenitySelectorModal } from '#/components/admin/rooms/AmenitySelectorModal'

describe('AmenitySelectorModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    selectedAmenities: ['Wi-Fi'],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <AmenitySelectorModal {...defaultProps} isOpen={false} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders modal header, search input, and amenity categories when open', () => {
    render(<AmenitySelectorModal {...defaultProps} />)
    expect(screen.getByText(/select resort amenities/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/search amenities/i)).toBeInTheDocument()
  })

  it('allows filtering amenities via search query input', async () => {
    const user = userEvent.setup()
    render(<AmenitySelectorModal {...defaultProps} />)

    const searchInput = screen.getByPlaceholderText(/search amenities/i)
    await user.type(searchInput, 'Wi-Fi')

    const wifiElements = screen.getAllByText('Wi-Fi')
    expect(wifiElements.length).toBeGreaterThan(0)
  })

  it('toggles individual amenity selection and saves changes', async () => {
    const user = userEvent.setup()
    render(<AmenitySelectorModal {...defaultProps} />)

    const amenityItems = screen.getAllByText('Air conditioning / heating')
    await user.click(amenityItems[0])

    const saveBtn = screen.getByRole('button', { name: /save|apply/i })
    await user.click(saveBtn)

    expect(defaultProps.onSave).toHaveBeenCalledWith(
      expect.arrayContaining(['Wi-Fi', 'Air conditioning / heating']),
    )
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('unselects an amenity when clicked a second time', async () => {
    const user = userEvent.setup()
    render(
      <AmenitySelectorModal {...defaultProps} selectedAmenities={['Wi-Fi']} />,
    )

    const wifiItem = screen.getAllByText('Wi-Fi')[0]
    await user.click(wifiItem)

    const saveBtn = screen.getByRole('button', { name: /save|apply/i })
    await user.click(saveBtn)

    expect(defaultProps.onSave).toHaveBeenCalledWith([])
  })

  it('selects and deselects all amenities in a category when clicking Select All / Deselect All', async () => {
    const user = userEvent.setup()
    render(<AmenitySelectorModal {...defaultProps} selectedAmenities={[]} />)

    const selectAllBtn = screen.getAllByRole('button', {
      name: /select all/i,
    })[0]
    await user.click(selectAllBtn)

    const deselectAllBtn = screen.getAllByRole('button', {
      name: /deselect all/i,
    })[0]
    await user.click(deselectAllBtn)

    const saveBtn = screen.getByRole('button', { name: /save|apply/i })
    await user.click(saveBtn)

    expect(defaultProps.onSave).toHaveBeenCalledWith([])
  })

  it('closes modal on cancel or close without triggering onSave', async () => {
    const user = userEvent.setup()
    render(<AmenitySelectorModal {...defaultProps} />)

    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelBtn)

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    expect(defaultProps.onSave).not.toHaveBeenCalled()
  })
})
