import { useMemo, useState } from 'react'
import { Ban, CalendarOff, Loader2, Plus, Trash2, X } from 'lucide-react'
import {
  createBlockedDate,
  deleteBlockedDate,
} from '#/server/booking-actions'
import { StayDateRangePicker } from '#/components/public/StayDateRangePicker'
import { isWholeHouseRoom } from '#/lib/constants/rooms'
import {
  formatDate,
  formatDateInput,
  formatLocalDate,
} from '#/lib/formatters'
import type {
  BlockedDateItem,
  BookedDateRange,
  BookingItem,
  BookingRoomOption,
} from '#/types'

interface BlockedDatesModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => Promise<void> | void
  rooms: BookingRoomOption[]
  blockedDates: BlockedDateItem[]
  existingBookings: BookingItem[]
}

const REASON_PRESETS = [
  'New Year — Family Use',
  'Holiday / Family Stay',
  'Personal / Owner Use',
  'Property Maintenance',
  'Private Event',
] as const

function getDefaultDates() {
  const today = new Date()
  const tomorrow = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  )
  return {
    startDate: formatLocalDate(today),
    endDate: formatLocalDate(tomorrow),
  }
}

export function BlockedDatesModal({
  isOpen,
  onClose,
  onSuccess,
  rooms,
  blockedDates,
  existingBookings,
}: BlockedDatesModalProps) {
  const defaults = getDefaultDates()
  const [scopeRoomId, setScopeRoomId] = useState<string>('ALL')
  const [startDate, setStartDate] = useState(defaults.startDate)
  const [endDate, setEndDate] = useState(defaults.endDate)
  const [reason, setReason] = useState('New Year — Family Use')
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedRoom = useMemo(
    () => (scopeRoomId === 'ALL' ? null : rooms.find((r) => r.id === scopeRoomId)),
    [rooms, scopeRoomId],
  )

  const existingRanges = useMemo<BookedDateRange[]>(() => {
    const blocksAll = !selectedRoom || isWholeHouseRoom(selectedRoom)
    const bookingRanges = existingBookings
      .filter(
        (b) =>
          !b.deletedAt &&
          ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(b.status) &&
          (blocksAll ||
            b.roomId === selectedRoom.id ||
            isWholeHouseRoom(b.room)),
      )
      .map((b) => ({
        checkIn: formatDateInput(b.checkIn),
        checkOut: formatDateInput(b.checkOut),
      }))
    const blockRanges = blockedDates
      .filter(
        (bd) =>
          blocksAll ||
          !bd.roomId ||
          bd.roomId === selectedRoom.id ||
          isWholeHouseRoom(bd.room),
      )
      .map((bd) => ({
        checkIn: formatDateInput(bd.startDate),
        checkOut: formatDateInput(bd.endDate),
      }))
    return [...bookingRanges, ...blockRanges].filter(
      (r) => Boolean(r.checkIn) && Boolean(r.checkOut),
    )
  }, [existingBookings, blockedDates, selectedRoom])

  if (!isOpen) return null

  async function handleAddBlockedDate(e: React.FormEvent) {
    e.preventDefault()
    if (!startDate || !endDate) {
      setError('Please select both a start date and an end date.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await createBlockedDate({
        data: {
          roomId: scopeRoomId === 'ALL' ? null : scopeRoomId,
          startDate,
          endDate,
          reason: reason.trim() || 'Personal / Family Use',
        },
      })
      await onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to block dates.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteBlockedDate(id: string) {
    setDeletingId(id)
    setError(null)
    try {
      await deleteBlockedDate({ data: { id } })
      await onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to unblock dates.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 p-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center border border-rose-200">
              <CalendarOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Block House / Room Dates
              </h3>
              <p className="text-xs text-stone-500">
                Mark dates when the house or a room is unavailable for guest
                bookings (e.g. New Year family stay)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Create Blocked Date Form */}
          <form
            onSubmit={handleAddBlockedDate}
            className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3.5"
          >
            <div>
              <label
                htmlFor="block-scope"
                className="block font-semibold text-stone-700 mb-1"
              >
                What to Block
              </label>
              <select
                id="block-scope"
                value={scopeRoomId}
                onChange={(e) => setScopeRoomId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              >
                <option value="ALL">
                  Entire Property / Whole House (Blocks All Rooms)
                </option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    Room {room.roomNumber} — {room.name} ({room.type})
                  </option>
                ))}
              </select>
            </div>

            <StayDateRangePicker
              idPrefix="block-dates"
              checkInLabel="Unavailable From (Check-In)"
              checkOutLabel="Available Again On (Check-Out)"
              checkIn={startDate}
              checkOut={endDate}
              bookedRanges={existingRanges}
              required
              onChange={({ checkIn, checkOut }) => {
                setStartDate(checkIn)
                setEndDate(checkOut)
              }}
            />

            <div>
              <label
                htmlFor="block-reason"
                className="block font-semibold text-stone-700 mb-1"
              >
                Reason / Note
              </label>
              <input
                id="block-reason"
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. New Year — Family Use"
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {REASON_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReason(preset)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition cursor-pointer ${
                      reason === preset
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-rose-900 text-white font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {loading ? 'Blocking Dates...' : 'Add Blocked Dates'}
            </button>
          </form>

          {/* Existing Blocked Dates List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px]">
                Blocked Date Ranges ({blockedDates.length})
              </h4>
            </div>

            {blockedDates.length === 0 ? (
              <div className="rounded-xl border border-stone-200/80 bg-white p-6 text-center text-stone-500">
                No blocked date ranges configured. All unbooked dates are open
                for guest reservations.
              </div>
            ) : (
              <div className="space-y-2">
                {blockedDates.map((bd) => {
                  const isDeleting = deletingId === bd.id
                  const scopeLabel = bd.room
                    ? `Room ${bd.room.roomNumber} (${bd.room.name})`
                    : 'Entire Property (All Rooms)'
                  return (
                    <div
                      key={bd.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-rose-200/80 bg-rose-50/40"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 font-bold text-[10px]">
                            <Ban className="w-3 h-3" />
                            {scopeLabel}
                          </span>
                          <span className="font-semibold text-stone-900">
                            {formatDate(bd.startDate)} → {formatDate(bd.endDate)}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 truncate">
                          {bd.reason}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDeleteBlockedDate(bd.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-[11px] inline-flex items-center gap-1 shrink-0 transition cursor-pointer disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Unblock
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-stone-100 bg-white rounded-b-2xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl cursor-pointer transition text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
