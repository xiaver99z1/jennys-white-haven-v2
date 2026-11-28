import { useMemo, useState } from 'react'
import { Ban, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import type {
  BlockedDateItem,
  BookingItem,
  BookingRoomOption,
  StatusMeta,
} from '#/types'
import { isWholeHouseRoom } from '#/lib/constants/rooms'
import {
  formatCalendarDayHeader,
  formatDate,
  formatFullName,
  formatLocalDate,
  getBookingStatusMeta,
} from '#/lib/formatters'
import { EmptyState } from '#/components/common/EmptyState'

interface BookingCalendarProps {
  bookings: BookingItem[]
  rooms: BookingRoomOption[]
  blockedDates?: BlockedDateItem[]
  onSelectBooking: (booking: BookingItem) => void
  onManageBlockedDates?: () => void
}

interface NormalizedBookingCell {
  booking: BookingItem
  checkInIso: string
  checkOutIso: string
  guestName: string
  statusMeta: StatusMeta
}

interface NormalizedBlockedCell {
  block: BlockedDateItem
  startIso: string
  endIso: string
  blocksAll: boolean
}

const DAYS_TO_SHOW = 14

function addDays(base: Date, days: number): Date {
  const next = new Date(base)
  next.setDate(next.getDate() + days)
  return next
}

function getTodayStart(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function BookingCalendar({
  bookings,
  rooms,
  blockedDates = [],
  onSelectBooking,
  onManageBlockedDates,
}: BookingCalendarProps) {
  const [startDate, setStartDate] = useState<Date>(getTodayStart)

  const days = useMemo(
    () =>
      Array.from({ length: DAYS_TO_SHOW }, (_, i) => {
        const d = addDays(startDate, i)
        const { dayLabel, dateLabel } = formatCalendarDayHeader(d)
        return {
          iso: formatLocalDate(d),
          dayLabel,
          dateLabel,
        }
      }),
    [startDate],
  )

  const todayIso = useMemo(() => formatLocalDate(getTodayStart()), [])

  const bookingsByRoomId = useMemo(() => {
    const map = new Map<string, NormalizedBookingCell[]>()
    for (const booking of bookings) {
      if (booking.deletedAt || booking.status === 'CANCELLED') continue
      const entry: NormalizedBookingCell = {
        booking,
        checkInIso: formatDate(booking.checkIn),
        checkOutIso: formatDate(booking.checkOut),
        guestName: formatFullName(
          booking.guest.firstName,
          booking.guest.lastName,
        ),
        statusMeta: getBookingStatusMeta(booking.status),
      }
      const existing = map.get(booking.roomId)
      if (existing) {
        existing.push(entry)
      } else {
        map.set(booking.roomId, [entry])
      }
    }
    return map
  }, [bookings])

  const normalizedBlocks = useMemo<NormalizedBlockedCell[]>(
    () =>
      blockedDates.map((bd) => ({
        block: bd,
        startIso: formatDate(bd.startDate),
        endIso: formatDate(bd.endDate),
        blocksAll: !bd.roomId || isWholeHouseRoom(bd.room),
      })),
    [blockedDates],
  )

  if (rooms.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs">
        <EmptyState
          icon={<Calendar className="w-6 h-6 text-amber-800" />}
          title="No rooms available"
          description="Add rooms first to view the room-by-date booking calendar."
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
      {/* Calendar Navigation */}
      <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between gap-2 bg-stone-50/50">
        <div className="text-xs font-semibold text-stone-700">
          {days[0].dateLabel} — {days[days.length - 1].dateLabel}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => setStartDate((prev) => addDays(prev, -7))}
            className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setStartDate(getTodayStart())}
            className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-xs font-semibold text-stone-700 transition cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next week"
            onClick={() => setStartDate((prev) => addDays(prev, 7))}
            className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Room-by-Date Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs min-w-[900px]">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50/70">
              <th className="py-2.5 px-3 text-left font-bold text-stone-600 w-44 sticky left-0 bg-stone-50 z-10 border-r border-stone-200">
                Room
              </th>
              {days.map((day) => (
                <th
                  key={day.iso}
                  className={`py-2 px-1.5 text-center font-semibold border-r border-stone-100 min-w-20 ${
                    day.iso === todayIso
                      ? 'bg-amber-50 text-amber-900'
                      : 'text-stone-600'
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wider opacity-75">
                    {day.dayLabel}
                  </div>
                  <div>{day.dateLabel}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rooms.map((room) => {
              const roomBookings = bookingsByRoomId.get(room.id) ?? []
              const roomIsWholeHouse = isWholeHouseRoom(room)

              return (
                <tr key={room.id} className="hover:bg-stone-50/40">
                  <td className="py-2.5 px-3 sticky left-0 bg-white z-10 border-r border-stone-200">
                    <div className="font-bold text-stone-900">
                      Room {room.roomNumber}
                    </div>
                    <div className="text-[11px] text-stone-500 truncate max-w-36">
                      {room.name}
                    </div>
                  </td>
                  {days.map((day) => {
                    const match = roomBookings.find(
                      (entry) =>
                        day.iso >= entry.checkInIso &&
                        day.iso < entry.checkOutIso,
                    )

                    const matchingBlock = match
                      ? undefined
                      : normalizedBlocks.find(
                          (entry) =>
                            day.iso >= entry.startIso &&
                            day.iso < entry.endIso &&
                            (entry.blocksAll ||
                              roomIsWholeHouse ||
                              entry.block.roomId === room.id),
                        )

                    if (!match && !matchingBlock) {
                      return (
                        <td
                          key={day.iso}
                          className={`p-1 border-r border-stone-100 ${
                            day.iso === todayIso ? 'bg-amber-50/30' : ''
                          }`}
                        />
                      )
                    }

                    if (!match && matchingBlock) {
                      return (
                        <td
                          key={day.iso}
                          className={`p-1 border-r border-stone-100 align-middle ${
                            day.iso === todayIso ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => onManageBlockedDates?.()}
                            title={`Blocked: ${matchingBlock.block.reason}`}
                            className="w-full text-left px-1.5 py-1 rounded-md border border-rose-300 bg-rose-100/90 text-rose-900 text-[10px] font-semibold truncate transition hover:bg-rose-200 cursor-pointer flex items-center gap-1"
                          >
                            <Ban className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">
                              {matchingBlock.block.reason}
                            </span>
                          </button>
                        </td>
                      )
                    }

                    const activeMatch = match!

                    return (
                      <td
                        key={day.iso}
                        className={`p-1 border-r border-stone-100 align-middle ${
                          day.iso === todayIso ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectBooking(activeMatch.booking)}
                          title={`${activeMatch.guestName} (${activeMatch.booking.bookingReference}) — ${activeMatch.statusMeta.label}`}
                          className={`w-full text-left px-1.5 py-1 rounded-md border text-[10px] font-semibold truncate transition hover:opacity-85 cursor-pointer ${activeMatch.statusMeta.className}`}
                        >
                          {activeMatch.guestName}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
