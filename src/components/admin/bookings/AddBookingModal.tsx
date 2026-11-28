import { useState, useMemo } from 'react'
import { createBooking } from '#/server/booking-actions'
import { X, CalendarPlus } from 'lucide-react'
import { StayDateRangePicker } from '#/components/public/StayDateRangePicker'
import { ExtraGuestsCounterField } from '#/components/common/ExtraGuestsCounterField'
import { FieldError, getFieldValidationClass } from '#/components/common/FormFieldError'
import {
  BOOKING_STATUSES,
  DEFAULT_EXTRA_CHILD_FEE,
  DEFAULT_EXTRA_PERSON_FEE,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  buildOccupiedBookedRanges,
  calculateExtraGuestsFee,
  formatExtraGuestsNote,
  getTotalExtraGuests,
} from '#/lib/constants/rooms'
import type {
  BlockedDateItem,
  BookedDateRange,
  BookingGuestOption,
  BookingItem,
  BookingRoomOption,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
} from '#/types'
import { computeStayNights, formatLocalDate, formatPeso } from '#/lib/formatters'
import {
  hasFieldErrors,
  validateIntegerField,
  validateMoneyField,
  validateStayDatesRange,
  validateTextField,
} from '#/lib/validation'

export type { BookingGuestOption, BookingRoomOption }
export { formatLocalDate }

interface AddBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => Promise<void> | void
  rooms: BookingRoomOption[]
  guests: BookingGuestOption[]
  existingBookings?: BookingItem[]
  blockedDates?: BlockedDateItem[]
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
  existingBookings = [],
  blockedDates = [],
}: AddBookingModalProps) {
  const defaultDates = getDefaultDates()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    guestId?: string | null
    roomId?: string | null
    dates?: string | null
    guestsCount?: string | null
    amountPaid?: string | null
    specialRequests?: string | null
  }>({})

  const [formData, setFormData] = useState({
    roomId: rooms[0]?.id ?? '',
    guestId: guests[0]?.id ?? '',
    checkIn: defaultDates.checkIn,
    checkOut: defaultDates.checkOut,
    guestsCount: 2,
    extraAdults: 0,
    extraChildren: 0,
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

  const roomBookedRanges = useMemo<BookedDateRange[]>(
    () =>
      buildOccupiedBookedRanges({
        existingBookings,
        blockedDates,
        roomId: formData.roomId,
        targetRoom: selectedRoom,
      }),
    [existingBookings, blockedDates, formData.roomId, selectedRoom],
  )

  const nights = useMemo(
    () => computeStayNights(formData.checkIn, formData.checkOut),
    [formData.checkIn, formData.checkOut],
  )

  const isValidStay = nights > 0

  const extraPersonFeeRate = useMemo(
    () =>
      Number(selectedRoom?.extraPersonFee ?? DEFAULT_EXTRA_PERSON_FEE),
    [selectedRoom],
  )

  const extraChildFeeRate = useMemo(
    () =>
      Number(selectedRoom?.extraChildFee ?? DEFAULT_EXTRA_CHILD_FEE),
    [selectedRoom],
  )

  const totalExtraGuests = useMemo(
    () => getTotalExtraGuests(formData),
    [formData.extraAdults, formData.extraChildren],
  )

  const extraGuestsFeeTotal = useMemo(
    () =>
      calculateExtraGuestsFee(
        formData,
        { extraAdultFee: extraPersonFeeRate, extraChildFee: extraChildFeeRate },
        nights,
      ),
    [
      formData.extraAdults,
      formData.extraChildren,
      extraPersonFeeRate,
      extraChildFeeRate,
      nights,
    ],
  )

  const baseRoomTotal = useMemo(() => {
    const rate = selectedRoom ? Number(selectedRoom.pricePerNight) : 0
    return nights * rate
  }, [nights, selectedRoom])

  const calculatedTotal = useMemo(
    () => baseRoomTotal + extraGuestsFeeTotal,
    [baseRoomTotal, extraGuestsFeeTotal],
  )

  if (!isOpen) return null

  const maxGuestsAllowed = selectedRoom?.capacity ?? 30

  const validateAllFields = () => ({
    guestId: !formData.guestId ? 'Please select a guest.' : null,
    roomId: !formData.roomId ? 'Please select a room.' : null,
    dates: validateStayDatesRange(formData.checkIn, formData.checkOut),
    guestsCount: validateIntegerField(Number(formData.guestsCount), {
      label: 'Guests count',
      min: 1,
      max: maxGuestsAllowed,
    }),
    amountPaid: validateMoneyField(Number(formData.amountPaid), {
      label: 'Amount paid',
      min: 0,
      allowZero: true,
    }),
    specialRequests: validateTextField(formData.specialRequests, {
      label: 'Special requests',
      required: false,
      maxLength: 500,
    }),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const nextErrors = validateAllFields()
    setFieldErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) {
      return
    }
    setLoading(true)

    try {
      const extraNote = formatExtraGuestsNote(
        formData,
        { extraAdultFee: extraPersonFeeRate, extraChildFee: extraChildFeeRate },
        nights,
      )
      const combinedSpecialRequests =
        [formData.specialRequests.trim(), extraNote]
          .filter(Boolean)
          .join(' ') || undefined

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
          specialRequests: combinedSpecialRequests,
        },
      })

      setFormData({
        roomId: rooms[0]?.id ?? '',
        guestId: guests[0]?.id ?? '',
        checkIn: defaultDates.checkIn,
        checkOut: defaultDates.checkOut,
        guestsCount: 2,
        extraAdults: 0,
        extraChildren: 0,
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
          noValidate
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
                  onChange={(e) => {
                    const next = e.target.value
                    setFormData({ ...formData, guestId: next })
                    if (fieldErrors.guestId) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        guestId: !next ? 'Please select a guest.' : null,
                      }))
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.guestId)}
                  className={getFieldValidationClass(
                    'w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800 bg-white',
                    Boolean(fieldErrors.guestId),
                  )}
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
                <FieldError message={fieldErrors.guestId} />
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
                  onChange={(e) => {
                    const next = e.target.value
                    setFormData({ ...formData, roomId: next })
                    if (fieldErrors.roomId) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        roomId: !next ? 'Please select a room.' : null,
                      }))
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.roomId)}
                  className={getFieldValidationClass(
                    'w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800 bg-white',
                    Boolean(fieldErrors.roomId),
                  )}
                >
                  <option value="" disabled>
                    Select a room
                  </option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      Room {room.roomNumber} - {room.name} (
                      {formatPeso(room.pricePerNight)}/night)
                    </option>
                  ))}
                </select>
                <FieldError message={fieldErrors.roomId} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="sm:col-span-2">
                <StayDateRangePicker
                  idPrefix="add-booking"
                  checkInLabel="Check-In Date"
                  checkOutLabel="Check-Out Date"
                  checkIn={formData.checkIn}
                  checkOut={formData.checkOut}
                  bookedRanges={roomBookedRanges}
                  allowPastDates
                  required
                  onChange={({ checkIn, checkOut }) => {
                    setFormData((prev) => ({ ...prev, checkIn, checkOut }))
                    if (fieldErrors.dates) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        dates: validateStayDatesRange(checkIn, checkOut),
                      }))
                    }
                  }}
                />
                <FieldError message={fieldErrors.dates} />
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
                  max={maxGuestsAllowed}
                  required
                  value={formData.guestsCount}
                  onChange={(e) => {
                    const next = Number(e.target.value)
                    setFormData({
                      ...formData,
                      guestsCount: next,
                    })
                    if (fieldErrors.guestsCount) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        guestsCount: validateIntegerField(next, {
                          label: 'Guests count',
                          min: 1,
                          max: maxGuestsAllowed,
                        }),
                      }))
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.guestsCount)}
                  className={getFieldValidationClass(
                    'w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800',
                    Boolean(fieldErrors.guestsCount),
                  )}
                />
                <FieldError message={fieldErrors.guestsCount} />
              </div>
            </div>

            {/* Additional Persons (Adult / Child) Mobile-Friendly Auto-Compute */}
            <ExtraGuestsCounterField
              idPrefix="add-booking"
              variant="admin"
              extraAdults={formData.extraAdults}
              extraChildren={formData.extraChildren}
              extraAdultFee={extraPersonFeeRate}
              extraChildFee={extraChildFeeRate}
              extraTotalFee={extraGuestsFeeTotal}
              maxPerCategory={20}
              onChangeAdults={(extraAdults) =>
                setFormData((prev) => ({ ...prev, extraAdults }))
              }
              onChangeChildren={(extraChildren) =>
                setFormData((prev) => ({ ...prev, extraChildren }))
              }
            />

            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider">
                  Stay Summary
                </span>
                <p className="text-xs text-stone-600 mt-0.5">
                  {isValidStay
                    ? `${nights} night(s) × ${formatPeso(
                        selectedRoom ? selectedRoom.pricePerNight : 0,
                      )}${
                        totalExtraGuests > 0
                          ? ` + ${totalExtraGuests} extra person(s) (${formatPeso(extraGuestsFeeTotal)})`
                          : ''
                      }`
                    : 'Check-out date must be after check-in date'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-stone-500">Total Amount</span>
                <p className="text-base font-bold text-amber-900">
                  {formatPeso(calculatedTotal)}
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
                  onChange={(e) => {
                    const next = Number(e.target.value)
                    setFormData({
                      ...formData,
                      amountPaid: next,
                    })
                    if (fieldErrors.amountPaid) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        amountPaid: validateMoneyField(next, {
                          label: 'Amount paid',
                          min: 0,
                          allowZero: true,
                        }),
                      }))
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.amountPaid)}
                  className={getFieldValidationClass(
                    'w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800',
                    Boolean(fieldErrors.amountPaid),
                  )}
                />
                <FieldError message={fieldErrors.amountPaid} />
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
                maxLength={500}
                placeholder="Early check-in, extra pillows, airport pickup..."
                value={formData.specialRequests}
                onChange={(e) => {
                  const next = e.target.value
                  setFormData({ ...formData, specialRequests: next })
                  if (fieldErrors.specialRequests) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      specialRequests: validateTextField(next, {
                        label: 'Special requests',
                        required: false,
                        maxLength: 500,
                      }),
                    }))
                  }
                }}
                aria-invalid={Boolean(fieldErrors.specialRequests)}
                className={getFieldValidationClass(
                  'w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800 resize-none',
                  Boolean(fieldErrors.specialRequests),
                )}
              />
              <FieldError message={fieldErrors.specialRequests} />
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
