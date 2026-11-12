import { useState, useMemo } from 'react'
import { createBooking } from '#/server/booking-actions'
import { X, CalendarPlus } from 'lucide-react'
import {
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
} from '#/lib/constants/rooms'
import type {
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
} from '#/lib/constants/rooms'

export interface BookingRoomOption {
  id: string
  roomNumber: string
  name: string
  type: string
  capacity: number
  pricePerNight: number
}

export interface BookingGuestOption {
  id: string
  firstName: string
  lastName: string
  phone: string
  email?: string | null
}

interface AddBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => Promise<void> | void
  rooms: BookingRoomOption[]
  guests: BookingGuestOption[]
}

export const formatLocalDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getDefaultDates = () => {
  const today = new Date()
  const tomorrow = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  )
  return {
    checkIn: formatLocalDate(today),
    checkOut: formatLocalDate(tomorrow),
  }
}

export function AddBookingModal({
  isOpen,
  onClose,
  onSuccess,
  rooms,
  guests,
}: AddBookingModalProps) {
  const defaultDates = getDefaultDates()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    roomId: rooms[0]?.id ?? '',
    guestId: guests[0]?.id ?? '',
    checkIn: defaultDates.checkIn,
    checkOut: defaultDates.checkOut,
    guestsCount: 2,
    status: 'CONFIRMED' as BookingStatus,
    paymentStatus: 'UNPAID' as PaymentStatus,
    paymentMethod: '' as PaymentMethod | '',
    amountPaid: 0,
    specialRequests: '',
  })

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === formData.roomId),
    [rooms, formData.roomId],
  )

  const nights = useMemo(() => {
    const start = new Date(formData.checkIn)
    const end = new Date(formData.checkOut)
    const diff = Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    )
    return diff > 0 ? diff : 0
  }, [formData.checkIn, formData.checkOut])

  const isValidStay = nights > 0

  const calculatedTotal = useMemo(() => {
    const rate = selectedRoom ? Number(selectedRoom.pricePerNight) : 0
    return nights * rate
  }, [nights, selectedRoom])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await createBooking({
        data: {
          roomId: formData.roomId,
          guestId: formData.guestId,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          guestsCount: Number(formData.guestsCount),
          totalAmount: calculatedTotal,
          amountPaid: Number(formData.amountPaid),
          paymentStatus: formData.paymentStatus,
          paymentMethod: formData.paymentMethod || undefined,
          status: formData.status,
          specialRequests: formData.specialRequests.trim() || undefined,
        },
      })

      setFormData({
        roomId: rooms[0]?.id ?? '',
        guestId: guests[0]?.id ?? '',
        checkIn: defaultDates.checkIn,
        checkOut: defaultDates.checkOut,
        guestsCount: 2,
        status: 'CONFIRMED',
        paymentStatus: 'UNPAID',
        paymentMethod: '',
        amountPaid: 0,
        specialRequests: '',
      })
      await onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create booking.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 p-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center border border-amber-200">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Create New Booking
              </h3>
              <p className="text-xs text-stone-500">
                Assign a room and guest for a staycation reservation
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

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="add-booking-guest"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Guest <span className="text-rose-500">*</span>
                </label>
                <select
                  id="add-booking-guest"
                  required
                  value={formData.guestId}
                  onChange={(e) =>
                    setFormData({ ...formData, guestId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800 bg-white"
                >
                  <option value="" disabled>
                    Select a guest
                  </option>
                  {guests.map((guest) => (
                    <option key={guest.id} value={guest.id}>
                      {guest.firstName} {guest.lastName} ({guest.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="add-booking-room"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Room <span className="text-rose-500">*</span>
                </label>
                <select
                  id="add-booking-room"
                  required
                  value={formData.roomId}
                  onChange={(e) =>
                    setFormData({ ...formData, roomId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800 bg-white"
                >
                  <option value="" disabled>
                    Select a room
                  </option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      Room {room.roomNumber} - {room.name} (₱
                      {Number(room.pricePerNight).toLocaleString()}/night)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="add-booking-checkin"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Check-In Date <span className="text-rose-500">*</span>
                </label>
                <input
                  id="add-booking-checkin"
                  type="date"
                  required
                  value={formData.checkIn}
                  onChange={(e) =>
                    setFormData({ ...formData, checkIn: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800"
                />
              </div>
              <div>
                <label
                  htmlFor="add-booking-checkout"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Check-Out Date <span className="text-rose-500">*</span>
                </label>
                <input
                  id="add-booking-checkout"
                  type="date"
                  required
                  value={formData.checkOut}
                  onChange={(e) =>
                    setFormData({ ...formData, checkOut: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800"
                />
              </div>
              <div>
                <label
                  htmlFor="add-booking-guests-count"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Guests Count
                </label>
                <input
                  id="add-booking-guests-count"
                  type="number"
                  min={1}
                  max={30}
                  required
                  value={formData.guestsCount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      guestsCount: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider">
                  Stay Summary
                </span>
                <p className="text-xs text-stone-600 mt-0.5">
                  {isValidStay
                    ? `${nights} night(s) × ₱${
                        selectedRoom
                          ? Number(selectedRoom.pricePerNight).toLocaleString()
                          : '0'
                      }`
                    : 'Check-out date must be after check-in date'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-stone-500">Total Amount</span>
                <p className="text-base font-bold text-amber-900">
                  ₱{calculatedTotal.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="add-booking-status"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Booking Status
                </label>
                <select
                  id="add-booking-status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as BookingStatus,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800 bg-white"
                >
                  {BOOKING_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="add-booking-payment-status"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Payment Status
                </label>
                <select
                  id="add-booking-payment-status"
                  value={formData.paymentStatus}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      paymentStatus: e.target.value as PaymentStatus,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800 bg-white"
                >
                  {PAYMENT_STATUSES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="add-booking-payment-method"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Payment Method
                </label>
                <select
                  id="add-booking-payment-method"
                  value={formData.paymentMethod}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      paymentMethod: e.target.value as PaymentMethod | '',
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800 bg-white"
                >
                  <option value="">None / Not Specified</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="add-booking-amount-paid"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Amount Paid (₱)
                </label>
                <input
                  id="add-booking-amount-paid"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.amountPaid}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      amountPaid: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="add-booking-requests"
                className="block font-semibold text-stone-700 mb-1"
              >
                Special Requests / Notes
              </label>
              <textarea
                id="add-booking-requests"
                rows={2}
                placeholder="Early check-in, extra pillows, airport pickup..."
                value={formData.specialRequests}
                onChange={(e) =>
                  setFormData({ ...formData, specialRequests: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-stone-100 bg-white rounded-b-2xl shrink-0">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl cursor-pointer transition text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isValidStay}
              className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-xl shadow-md cursor-pointer transition disabled:opacity-50 text-xs"
            >
              {loading ? 'Creating...' : 'Create Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
