import { useState, useEffect, useMemo } from 'react'
import { updateBooking, deleteBooking } from '#/server/booking-actions'
import { X, CalendarCheck, Trash2 } from 'lucide-react'
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
import { ConfirmModal } from '#/components/common/ConfirmModal'
import type {
  BookingRoomOption,
  BookingGuestOption,
} from './AddBookingModal'

export interface BookingItem {
  id: string
  bookingReference: string
  roomId: string
  guestId: string
  checkIn: Date | string
  checkOut: Date | string
  nights: number
  guestsCount: number
  totalAmount: number
  amountPaid: number
  paymentStatus: string
  paymentMethod?: string | null
  status: string
  specialRequests?: string | null
  deletedAt?: Date | string | null
  room: {
    id: string
    roomNumber: string
    name: string
    type: string
    pricePerNight: number
  }
  guest: {
    id: string
    firstName: string
    lastName: string
    phone: string
    email?: string | null
  }
}

interface EditBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => Promise<void> | void
  onSaveStart: (bookingId: string) => void
  onSaveError?: () => void
  onDeleteStart: (bookingId: string) => void
  onDeleteError?: () => void
  booking: BookingItem | null
  rooms: BookingRoomOption[]
  guests: BookingGuestOption[]
}

const formatDateInput = (val: Date | string | undefined) => {
  if (!val) return ''
  return new Date(val).toISOString().split('T')[0]
}

const getInitialFormData = (booking: EditBookingModalProps['booking']) => ({
  roomId: booking?.roomId ?? '',
  guestId: booking?.guestId ?? '',
  checkIn: formatDateInput(booking?.checkIn),
  checkOut: formatDateInput(booking?.checkOut),
  guestsCount: booking?.guestsCount ?? 2,
  totalAmount: booking?.totalAmount ? Number(booking.totalAmount) : 0,
  amountPaid: booking?.amountPaid ? Number(booking.amountPaid) : 0,
  paymentStatus: (booking?.paymentStatus ?? 'UNPAID') as PaymentStatus,
  paymentMethod: (booking?.paymentMethod ?? '') as PaymentMethod | '',
  status: (booking?.status ?? 'PENDING') as BookingStatus,
  specialRequests: booking?.specialRequests ?? '',
})

export function EditBookingModal({
  isOpen,
  onClose,
  onSuccess,
  onSaveStart,
  onSaveError,
  onDeleteStart,
  onDeleteError,
  booking,
  rooms,
  guests,
}: EditBookingModalProps) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [formData, setFormData] = useState(() => getInitialFormData(booking))

  useEffect(() => {
    if (booking) {
      setFormData(getInitialFormData(booking))
      setError(null)
      setShowSaveConfirm(false)
      setShowDeleteConfirm(false)
    }
  }, [booking])

  const hasChanges = useMemo(() => {
    if (!booking) return false

    const initial = getInitialFormData(booking)

    if (formData.roomId !== initial.roomId) return true
    if (formData.guestId !== initial.guestId) return true
    if (formData.checkIn !== initial.checkIn) return true
    if (formData.checkOut !== initial.checkOut) return true
    if (formData.guestsCount !== initial.guestsCount) return true
    if (formData.totalAmount !== initial.totalAmount) return true
    if (formData.amountPaid !== initial.amountPaid) return true
    if (formData.paymentStatus !== initial.paymentStatus) return true
    if (formData.paymentMethod !== initial.paymentMethod) return true
    if (formData.status !== initial.status) return true
    if (formData.specialRequests !== initial.specialRequests) return true

    return false
  }, [formData, booking])

  if (!isOpen || !booking) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasChanges) return
    setShowSaveConfirm(true)
  }

  const handleSaveConfirm = async () => {
    setLoading(true)
    setError(null)
    setShowSaveConfirm(false)
    onSaveStart(booking.id)

    try {
      await updateBooking({
        data: {
          id: booking.id,
          roomId: formData.roomId,
          guestId: formData.guestId,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          guestsCount: Number(formData.guestsCount),
          totalAmount: Number(formData.totalAmount),
          amountPaid: Number(formData.amountPaid),
          paymentStatus: formData.paymentStatus,
          paymentMethod: formData.paymentMethod,
          status: formData.status,
          specialRequests: formData.specialRequests,
        },
      })
      await onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Failed to update booking:', err)
      setError(err.message || 'Failed to update booking.')
      onSaveError?.()
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    setError(null)
    setShowDeleteConfirm(false)
    onDeleteStart(booking.id)

    try {
      await deleteBooking({ data: { id: booking.id } })
      await onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Failed to delete booking:', err)
      setError(err.message || 'Failed to delete booking.')
      onDeleteError?.()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-stone-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-100 p-5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center border border-amber-200">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Edit Booking {booking.bookingReference}
                </h3>
                <p className="text-xs text-stone-500">
                  Update dates, room assignment, status, or payment details
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
                    htmlFor="edit-booking-guest"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Guest
                  </label>
                  <select
                    id="edit-booking-guest"
                    value={formData.guestId}
                    onChange={(e) =>
                      setFormData({ ...formData, guestId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800 bg-white"
                  >
                    {guests.map((guest) => (
                      <option key={guest.id} value={guest.id}>
                        {guest.firstName} {guest.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="edit-booking-room"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Room
                  </label>
                  <select
                    id="edit-booking-room"
                    value={formData.roomId}
                    onChange={(e) =>
                      setFormData({ ...formData, roomId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800 bg-white"
                  >
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        Room {room.roomNumber} - {room.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="edit-booking-checkin"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Check-In Date
                  </label>
                  <input
                    id="edit-booking-checkin"
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
                    htmlFor="edit-booking-checkout"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Check-Out Date
                  </label>
                  <input
                    id="edit-booking-checkout"
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
                    htmlFor="edit-booking-guests-count"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Guests Count
                  </label>
                  <input
                    id="edit-booking-guests-count"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="edit-booking-status"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Booking Status
                  </label>
                  <select
                    id="edit-booking-status"
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
                    htmlFor="edit-booking-payment-status"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Payment Status
                  </label>
                  <select
                    id="edit-booking-payment-status"
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

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="edit-booking-payment-method"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Payment Method
                  </label>
                  <select
                    id="edit-booking-payment-method"
                    value={formData.paymentMethod}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentMethod: e.target.value as PaymentMethod | '',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800 bg-white"
                  >
                    <option value="">None</option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="edit-booking-total"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Total Amount (₱)
                  </label>
                  <input
                    id="edit-booking-total"
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={formData.totalAmount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        totalAmount: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-booking-paid"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Amount Paid (₱)
                  </label>
                  <input
                    id="edit-booking-paid"
                    type="number"
                    min={0}
                    step="0.01"
                    required
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
                  htmlFor="edit-booking-requests"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Special Requests / Notes
                </label>
                <textarea
                  id="edit-booking-requests"
                  rows={2}
                  value={formData.specialRequests}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      specialRequests: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-stone-100 bg-white rounded-b-2xl shrink-0">
              <button
                type="button"
                disabled={deleting || loading}
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition text-xs disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> Delete Booking
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={loading || deleting}
                  onClick={onClose}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl cursor-pointer transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || deleting || !hasChanges}
                  className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-xl shadow-md cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        isOpen={showSaveConfirm}
        variant="amber"
        title={`Update Booking ${booking.bookingReference}?`}
        description={`Are you sure you want to save changes to booking "${booking.bookingReference}"?`}
        confirmText="Yes, Save Changes"
        cancelText="Cancel"
        isLoading={loading}
        onConfirm={handleSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        variant="danger"
        title={`Archive Booking ${booking.bookingReference}?`}
        description={`Are you sure you want to archive booking "${booking.bookingReference}"? You can restore it later from the archived bookings list.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isLoading={deleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </>
  )
}
