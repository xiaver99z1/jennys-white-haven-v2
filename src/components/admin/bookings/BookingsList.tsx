import { useState, useEffect } from 'react'
import { AddBookingModal } from '#/components/admin/bookings/AddBookingModal'
import type {
  BookingRoomOption,
  BookingGuestOption,
} from '#/components/admin/bookings/AddBookingModal'
import { EditBookingModal } from '#/components/admin/bookings/EditBookingModal'
import type { BookingItem } from '#/components/admin/bookings/EditBookingModal'
import { ConfirmModal } from '#/components/common/ConfirmModal'
import { restoreBooking } from '#/server/booking-actions'
import {
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
} from '#/lib/constants/rooms'
import type { BookingStatus } from '#/lib/constants/rooms'
import {
  Plus,
  Search,
  Calendar,
  Bed,
  Users,
  Edit2,
  RotateCcw,
  Archive,
  Loader2,
} from 'lucide-react'

interface BookingsListProps {
  initialBookings: BookingItem[]
  rooms: BookingRoomOption[]
  guests: BookingGuestOption[]
  router: any
}

const getBookingStatusBadge = (statusValue: string) => {
  const found = BOOKING_STATUSES.find((s) => s.value === statusValue)
  return found
    ? found.colorClass
    : 'bg-stone-100 text-stone-700 border-stone-200'
}

const getBookingStatusLabel = (statusValue: string) => {
  const found = BOOKING_STATUSES.find((s) => s.value === statusValue)
  return found ? found.label : statusValue
}

const getPaymentStatusBadge = (paymentValue: string) => {
  const found = PAYMENT_STATUSES.find((p) => p.value === paymentValue)
  return found
    ? found.colorClass
    : 'bg-stone-100 text-stone-600 border-stone-200'
}

export function BookingsList({
  initialBookings,
  rooms,
  guests,
  router,
}: BookingsListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | BookingStatus>('ALL')
  const [showDeleted, setShowDeleted] = useState(false)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingBooking, setEditingBooking] = useState<BookingItem | null>(null)
  const [restoringBookingTarget, setRestoringBookingTarget] =
    useState<BookingItem | null>(null)

  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    setRestoringId(null)
    setSavingId(null)
    setDeletingId(null)
  }, [initialBookings])

  const filteredBookings = initialBookings.filter((booking) => {
    const isDeleted = Boolean(booking.deletedAt)
    if (showDeleted ? !isDeleted : isDeleted) return false

    const fullGuestName =
      `${booking.guest.firstName} ${booking.guest.lastName}`.toLowerCase()
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      booking.bookingReference.toLowerCase().includes(q) ||
      fullGuestName.includes(q) ||
      booking.room.roomNumber.toLowerCase().includes(q) ||
      booking.room.name.toLowerCase().includes(q)

    const matchesStatus =
      statusFilter === 'ALL' || booking.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleConfirmRestore = async () => {
    const targetId = restoringBookingTarget!.id

    setRestoringBookingTarget(null)
    setRestoringId(targetId)

    try {
      const res = await restoreBooking({ data: { id: targetId } })
      if (res.success) {
        await router.invalidate()
      }
    } catch (err) {
      console.error('Failed to restore booking:', err)
      setRestoringId(null)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Bookings Management
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Manage staycation reservations, check-ins, check-outs, and payments
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-xl shadow-xs flex items-center gap-2 text-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> New Booking
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by reference (JWH-...), guest name, or room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
            {(['ALL', ...BOOKING_STATUSES.map((s) => s.value)] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                    statusFilter === status
                      ? 'bg-amber-900 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {status === 'ALL'
                    ? 'All Bookings'
                    : getBookingStatusLabel(status)}
                </button>
              ),
            )}
          </div>

          <div className="h-5 w-[1px] bg-stone-200 hidden sm:block mx-1" />

          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border ${
              showDeleted
                ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            {showDeleted ? 'View Active Bookings' : 'View Archived Bookings'}
          </button>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto mb-3 border border-amber-200/60">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-800">
              No bookings found
            </h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              {showDeleted
                ? 'No archived or soft-deleted bookings match your filters.'
                : 'Get started by creating your first staycation reservation.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/70 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4">Guest</th>
                  <th className="py-3.5 px-4">Room</th>
                  <th className="py-3.5 px-4">Stay Dates</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {filteredBookings.map((booking) => {
                  const isRestoringThis = restoringId === booking.id
                  const isSavingThis = savingId === booking.id
                  const isDeletingThis = deletingId === booking.id
                  const isRowLocked =
                    isRestoringThis || isSavingThis || isDeletingThis

                  return (
                    <tr
                      key={booking.id}
                      className={`hover:bg-amber-50/30 transition group ${
                        booking.deletedAt ? 'bg-stone-50/60' : ''
                      } ${isRowLocked ? 'opacity-60 pointer-events-none' : ''}`}
                    >
                      {/* Reference */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900 flex items-center gap-1.5">
                          {booking.bookingReference}
                          {booking.deletedAt && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md text-[10px] font-bold">
                              Archived
                            </span>
                          )}
                        </div>
                        {booking.specialRequests && (
                          <div className="text-[11px] text-stone-400 truncate max-w-44 mt-0.5">
                            {booking.specialRequests}
                          </div>
                        )}
                      </td>

                      {/* Guest */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-800">
                          {booking.guest.firstName} {booking.guest.lastName}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {booking.guest.phone}
                        </div>
                      </td>

                      {/* Room */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-800 flex items-center gap-1.5">
                          <Bed className="w-3.5 h-3.5 text-amber-800" />
                          Room {booking.room.roomNumber}
                        </div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                          <span>{booking.room.name}</span>
                          <span>•</span>
                          <Users className="w-3 h-3" />
                          <span>{booking.guestsCount}</span>
                        </div>
                      </td>

                      {/* Stay Dates */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-stone-800">
                          {new Date(booking.checkIn).toISOString().split('T')[0]}{' '}
                          →{' '}
                          {
                            new Date(booking.checkOut)
                              .toISOString()
                              .split('T')[0]
                          }
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {booking.nights} night(s)
                        </div>
                      </td>

                      {/* Payment */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900">
                          ₱{Number(booking.totalAmount).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPaymentStatusBadge(
                              booking.paymentStatus,
                            )}`}
                          >
                            {booking.paymentStatus}
                          </span>
                          <span className="text-[10px] text-stone-500">
                            Paid: ₱{Number(booking.amountPaid).toLocaleString()}
                          </span>
                        </div>
                      </td>

                      {/* Booking Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${getBookingStatusBadge(
                            booking.status,
                          )}`}
                        >
                          {getBookingStatusLabel(booking.status)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {booking.deletedAt ? (
                          <button
                            disabled={isRowLocked}
                            onClick={() => setRestoringBookingTarget(booking)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition shadow-2xs cursor-pointer disabled:opacity-50"
                          >
                            {isRestoringThis ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Restoring...
                              </>
                            ) : (
                              <>
                                <RotateCcw className="w-3.5 h-3.5" /> Restore
                                Booking
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            disabled={isRowLocked}
                            onClick={() => setEditingBooking(booking)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-amber-800 text-stone-700 hover:text-white font-semibold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                          >
                            {isSavingThis ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-800" />
                                Saving...
                              </>
                            ) : isDeletingThis ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Edit2 className="w-3.5 h-3.5" /> Edit Booking
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Booking Modal */}
      <AddBookingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={async () => {
          await router.invalidate()
        }}
        rooms={rooms}
        guests={guests}
      />

      {/* Edit Booking Modal */}
      <EditBookingModal
        isOpen={Boolean(editingBooking)}
        booking={editingBooking}
        rooms={rooms}
        guests={guests}
        onClose={() => setEditingBooking(null)}
        onSaveStart={(id) => setSavingId(id)}
        onDeleteStart={(id) => setDeletingId(id)}
        onSuccess={async () => {
          await router.invalidate()
          setEditingBooking(null)
        }}
      />

      {/* Restore Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(restoringBookingTarget)}
        variant="success"
        title={`Restore Booking ${restoringBookingTarget?.bookingReference || ''}?`}
        description={`Are you sure you want to restore booking "${restoringBookingTarget?.bookingReference || ''}" back to the active bookings list?`}
        confirmText="Yes, Restore"
        cancelText="Cancel"
        onConfirm={handleConfirmRestore}
        onClose={() => setRestoringBookingTarget(null)}
      />
    </div>
  )
}
