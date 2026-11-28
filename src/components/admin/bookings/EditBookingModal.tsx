import { useState, useEffect, useMemo } from 'react'
import { updateBooking, deleteBooking } from '#/server/booking-actions'
import { X, CalendarCheck, Trash2 } from 'lucide-react'
import { StayDateRangePicker } from '#/components/public/StayDateRangePicker'
import { ExtraGuestsCounterField } from '#/components/common/ExtraGuestsCounterField'
import {
  BOOKING_STATUSES,
  DEFAULT_EXTRA_CHILD_FEE,
  DEFAULT_EXTRA_PERSON_FEE,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  buildOccupiedBookedRanges,
  calculateExtraGuestsFee,
  formatExtraGuestsNote,
  parseExtraGuestsFromSpecialRequests,
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
import { ConfirmModal } from '#/components/common/ConfirmModal'
import { FieldError, getFieldValidationClass } from '#/components/common/FormFieldError'
import { computeStayNights, formatDateInput } from '#/lib/formatters'
import {
  hasFieldErrors,
  validateIntegerField,
  validateMoneyField,
  validateStayDatesRange,
  validateTextField,
} from '#/lib/validation'

type EditBookingFieldErrors = Partial<
  Record<
    | 'dates'
    | 'guestsCount'
    | 'totalAmount'
    | 'amountPaid'
    | 'specialRequests',
    string | null
  >
>

const EDIT_BOOKING_INPUT_CLASS =
  'w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800'

export type { BookingItem }

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
  existingBookings?: BookingItem[]
  blockedDates?: BlockedDateItem[]
}

const getPositiveNights = (checkIn: string, checkOut: string) => {
  const nights = computeStayNights(checkIn, checkOut)
  return nights > 0 ? nights : 1
}

const getInitialFormData = (booking: EditBookingModalProps['booking']) => {
  const checkIn = formatDateInput(booking?.checkIn)
  const checkOut = formatDateInput(booking?.checkOut)
  const nights =
    checkIn && checkOut ? getPositiveNights(checkIn, checkOut) : 1
  const parsedExtra = parseExtraGuestsFromSpecialRequests(
    booking?.specialRequests,
  )
  const fallbackExtraFee =
    parsedExtra.appliedExtraFee > 0
      ? parsedExtra.appliedExtraFee
      : calculateExtraGuestsFee(
          parsedExtra,
          {
            extraAdultFee: Number(
              booking?.room.extraPersonFee ?? DEFAULT_EXTRA_PERSON_FEE,
            ),
            extraChildFee: Number(
              booking?.room.extraChildFee ?? DEFAULT_EXTRA_CHILD_FEE,
            ),
          },
          nights,
        )

  return {
    roomId: booking?.roomId ?? '',
    guestId: booking?.guestId ?? '',
    checkIn,
    checkOut,
    guestsCount: booking?.guestsCount ?? 2,
    extraAdults: parsedExtra.extraAdults,
    extraChildren: parsedExtra.extraChildren,
    appliedExtraFee: fallbackExtraFee,
    totalAmount: booking?.totalAmount ? Number(booking.totalAmount) : 0,
    amountPaid: booking?.amountPaid ? Number(booking.amountPaid) : 0,
    paymentStatus: (booking?.paymentStatus ?? 'UNPAID') as PaymentStatus,
    paymentMethod: (booking?.paymentMethod ?? '') as PaymentMethod | '',
    status: (booking?.status ?? 'PENDING') as BookingStatus,
    specialRequests: parsedExtra.cleanSpecialRequests,
  }
}

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
  existingBookings = [],
  blockedDates = [],
}: EditBookingModalProps) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<EditBookingFieldErrors>({})
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [formData, setFormData] = useState(() => getInitialFormData(booking))

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === formData.roomId),
    [rooms, formData.roomId],
  )

  const nights = useMemo(
    () => getPositiveNights(formData.checkIn, formData.checkOut),
    [formData.checkIn, formData.checkOut],
  )

  const extraPersonFeeRate = useMemo(
    () => Number(selectedRoom?.extraPersonFee ?? DEFAULT_EXTRA_PERSON_FEE),
    [selectedRoom],
  )

  const extraChildFeeRate = useMemo(
    () => Number(selectedRoom?.extraChildFee ?? DEFAULT_EXTRA_CHILD_FEE),
    [selectedRoom],
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

  function handleExtraGuestChange(
    field: 'extraAdults' | 'extraChildren',
    nextVal: number,
  ) {
    setFormData((prev) => {
      const nextCounts = { ...prev, [field]: nextVal }
      const nextFee = calculateExtraGuestsFee(
        nextCounts,
        { extraAdultFee: extraPersonFeeRate, extraChildFee: extraChildFeeRate },
        nights,
      )
      return {
        ...prev,
        [field]: nextVal,
        appliedExtraFee: nextFee,
        totalAmount: Math.max(
          0,
          Number(prev.totalAmount) - prev.appliedExtraFee + nextFee,
        ),
      }
    })
  }

  function handleRoomChange(nextRoomId: string) {
    const nextRoom = rooms.find((r) => r.id === nextRoomId)
    const nextAdultRate = Number(
      nextRoom?.extraPersonFee ?? DEFAULT_EXTRA_PERSON_FEE,
    )
    const nextChildRate = Number(
      nextRoom?.extraChildFee ?? DEFAULT_EXTRA_CHILD_FEE,
    )
    setFormData((prev) => {
      const nextNights = getPositiveNights(prev.checkIn, prev.checkOut)
      const nextFee = calculateExtraGuestsFee(
        prev,
        { extraAdultFee: nextAdultRate, extraChildFee: nextChildRate },
        nextNights,
      )
      return {
        ...prev,
        roomId: nextRoomId,
        appliedExtraFee: nextFee,
        totalAmount: Math.max(
          0,
          Number(prev.totalAmount) - prev.appliedExtraFee + nextFee,
        ),
      }
    })
  }

  function handleDatesChange({
    checkIn,
    checkOut,
  }: {
    checkIn: string
    checkOut: string
  }) {
    setFormData((prev) => {
      const nextNights = getPositiveNights(checkIn, checkOut)
      const nextFee = calculateExtraGuestsFee(
        prev,
        { extraAdultFee: extraPersonFeeRate, extraChildFee: extraChildFeeRate },
        nextNights,
      )
      return {
        ...prev,
        checkIn,
        checkOut,
        appliedExtraFee: nextFee,
        totalAmount: Math.max(
          0,
          Number(prev.totalAmount) - prev.appliedExtraFee + nextFee,
        ),
      }
    })
  }

  const roomBookedRanges = useMemo<BookedDateRange[]>(
    () =>
      buildOccupiedBookedRanges({
        existingBookings,
        blockedDates,
        roomId: formData.roomId,
        targetRoom: selectedRoom,
        excludeBookingId: booking?.id,
      }),
    [existingBookings, blockedDates, booking?.id, formData.roomId, selectedRoom],
  )

  useEffect(() => {
    if (booking) {
      setFormData(getInitialFormData(booking))
      setError(null)
      setFieldErrors({})
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
    if (formData.extraAdults !== initial.extraAdults) return true
    if (formData.extraChildren !== initial.extraChildren) return true

    return false
  }, [formData, booking])

  if (!isOpen || !booking) return null

  const maxGuestsAllowed = selectedRoom?.capacity ?? 30

  const validateAllFields = (): EditBookingFieldErrors => ({
    dates: validateStayDatesRange(formData.checkIn, formData.checkOut),
    guestsCount: validateIntegerField(Number(formData.guestsCount), {
      label: 'Guests count',
      min: 1,
      max: maxGuestsAllowed,
    }),
    totalAmount: validateMoneyField(Number(formData.totalAmount), {
      label: 'Total amount',
      min: 0,
      allowZero: true,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasChanges) return
    setError(null)
    const nextErrors = validateAllFields()
    setFieldErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) {
      if (nextErrors.dates) {
        setError(nextErrors.dates)
      }
      return
    }
    setShowSaveConfirm(true)
  }

  const handleSaveConfirm = async () => {
    setLoading(true)
    setError(null)
    setShowSaveConfirm(false)
    onSaveStart(booking.id)

    try {
      const extraNote = formatExtraGuestsNote(
        formData,
        { extraAdultFee: extraPersonFeeRate, extraChildFee: extraChildFeeRate },
        nights,
      )
      const combinedSpecialRequests = [
        formData.specialRequests.trim(),
        extraNote,
      ]
        .filter(Boolean)
        .join(' ')

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
          specialRequests: combinedSpecialRequests,
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
                    onChange={(e) => handleRoomChange(e.target.value)}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="sm:col-span-2">
                  <StayDateRangePicker
                    idPrefix="edit-booking"
                    checkInLabel="Check-In Date"
                    checkOutLabel="Check-Out Date"
                    checkIn={formData.checkIn}
                    checkOut={formData.checkOut}
                    bookedRanges={roomBookedRanges}
                    allowPastDates
                    onChange={(dates) => {
                      handleDatesChange(dates)
                      if (fieldErrors.dates) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          dates: validateStayDatesRange(
                            dates.checkIn,
                            dates.checkOut,
                          ),
                        }))
                      }
                    }}
                  />
                  <FieldError message={fieldErrors.dates} />
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
                      EDIT_BOOKING_INPUT_CLASS,
                      Boolean(fieldErrors.guestsCount),
                    )}
                  />
                  <FieldError message={fieldErrors.guestsCount} />
                </div>
              </div>

              {/* Additional Persons (Adult / Child) Mobile-Friendly Auto-Compute */}
              <ExtraGuestsCounterField
                idPrefix="edit-booking"
                variant="admin"
                extraAdults={formData.extraAdults}
                extraChildren={formData.extraChildren}
                extraAdultFee={extraPersonFeeRate}
                extraChildFee={extraChildFeeRate}
                extraTotalFee={extraGuestsFeeTotal}
                maxPerCategory={20}
                onChangeAdults={(count) =>
                  handleExtraGuestChange('extraAdults', count)
                }
                onChangeChildren={(count) =>
                  handleExtraGuestChange('extraChildren', count)
                }
              />

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
                    onChange={(e) => {
                      const next = Number(e.target.value)
                      setFormData({
                        ...formData,
                        totalAmount: next,
                      })
                      if (fieldErrors.totalAmount) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          totalAmount: validateMoneyField(next, {
                            label: 'Total amount',
                            min: 0,
                            allowZero: true,
                          }),
                        }))
                      }
                    }}
                    aria-invalid={Boolean(fieldErrors.totalAmount)}
                    className={getFieldValidationClass(
                      EDIT_BOOKING_INPUT_CLASS,
                      Boolean(fieldErrors.totalAmount),
                    )}
                  />
                  <FieldError message={fieldErrors.totalAmount} />
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
                      EDIT_BOOKING_INPUT_CLASS,
                      Boolean(fieldErrors.amountPaid),
                    )}
                  />
                  <FieldError message={fieldErrors.amountPaid} />
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
                  maxLength={500}
                  value={formData.specialRequests}
                  onChange={(e) => {
                    const next = e.target.value
                    setFormData({
                      ...formData,
                      specialRequests: next,
                    })
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
                    `${EDIT_BOOKING_INPUT_CLASS} resize-none`,
                    Boolean(fieldErrors.specialRequests),
                  )}
                />
                <FieldError message={fieldErrors.specialRequests} />
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
