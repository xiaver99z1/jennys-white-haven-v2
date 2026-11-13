import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import type { BookingItem, BookingRoomOption } from '#/types'
import {
  formatDate,
  formatFullName,
  formatLocalDate,
  getBookingStatusMeta,
} from '#/lib/formatters'
import { EmptyState } from '#/components/common/EmptyState'

interface BookingCalendarProps {
  bookings: BookingItem[]
  rooms: BookingRoomOption[]
  onSelectBooking: (booking: BookingItem) => void
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
  onSelectBooking,
}: BookingCalendarProps) {
  const [startDate, setStartDate] = useState<Date>(getTodayStart)

  const days = useMemo(
    () =>
      Array.from({ length: DAYS_TO_SHOW }, (_, i) => {
        const d = addDays(startDate, i)
        return {
          iso: formatLocalDate(d),
          dayLabel: d.toLocaleDateString('en-US', { weekday: 'short' }),
          dateLabel: d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
        }
      }),
    [startDate],
  )

  const todayIso = formatLocalDate(getTodayStart())

  const activeBookings = useMemo(
    () =>
      bookings.filter(
        (b) => !b.deletedAt && b.status !== 'CANCELLED',
      ),
    [bookings],
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
              const roomBookings = activeBookings.filter(
                (b) => b.roomId === room.id,
              )

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
                    const match = roomBookings.find((b) => {
                      const checkIn = formatDate(b.checkIn)
                      const checkOut = formatDate(b.checkOut)
                      return day.iso >= checkIn && day.iso < checkOut
                    })

                    if (!match) {
                      return (
                        <td
                          key={day.iso}
                          className={`p-1 border-r border-stone-100 ${
                            day.iso === todayIso ? 'bg-amber-50/30' : ''
                          }`}
                        />
                      )
                    }

                    const meta = getBookingStatusMeta(match.status)
                    const guest = formatFullName(
                      match.guest.firstName,
                      match.guest.lastName,
                    )

                    return (
                      <td
                        key={day.iso}
                        className={`p-1 border-r border-stone-100 align-middle ${
                          day.iso === todayIso ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectBooking(match)}
                          title={`${guest} (${match.bookingReference}) — ${meta.label}`}
                          className={`w-full text-left px-1.5 py-1 rounded-md border text-[10px] font-semibold truncate transition hover:opacity-85 cursor-pointer ${meta.className}`}
                        >
                          {guest}
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
