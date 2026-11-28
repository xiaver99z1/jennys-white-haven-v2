import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, Loader2, Sparkles, Users } from 'lucide-react'
import { getPublicCmsSections } from '#/server/cms-actions'
import { createPublicBooking, getPublicRoomById } from '#/server/public-actions'
import { PublicLayout } from '#/components/public/PublicLayout'
import { StayDateRangePicker } from '#/components/public/StayDateRangePicker'
import { ExtraGuestsCounterField } from '#/components/common/ExtraGuestsCounterField'
import {
  FieldError,
  getFieldValidationClass,
} from '#/components/common/FormFieldError'
import { PhoneNumberInput } from '#/components/common/PhoneNumberInput'
import { calculateExtraGuestsFee } from '#/lib/constants/rooms'
import { useCurrency } from '#/lib/currency'
import { useI18n } from '#/lib/i18n'
import {
  hasFieldErrors,
  validateEmailField,
  validatePersonName,
  validatePhoneField,
  validateStayDatesRange,
  validateTextField,
} from '#/lib/validation'
import {
  computeStayNights,
  formatPeso,
  getErrorMessage,
  isValidCalendarDate,
} from '#/lib/formatters'

interface RoomDetailSearch {
  checkIn?: string
  checkOut?: string
  guests?: number
}

export const Route = createFileRoute('/rooms/$id')({
  validateSearch: (search: Record<string, unknown>): RoomDetailSearch => ({
    checkIn:
      typeof search.checkIn === 'string' && isValidCalendarDate(search.checkIn)
        ? search.checkIn
        : undefined,
    checkOut:
      typeof search.checkOut === 'string' &&
      isValidCalendarDate(search.checkOut)
        ? search.checkOut
        : undefined,
    guests:
      typeof search.guests === 'number' && search.guests > 0
        ? search.guests
        : typeof search.guests === 'string' && Number(search.guests) > 0
          ? Number(search.guests)
          : undefined,
  }),
  loader: async ({ params }) => {
    const [room, sections] = await Promise.all([
      getPublicRoomById({ data: { id: params.id } }),
      getPublicCmsSections(),
    ])
    return { room, sections }
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.room
          ? `${loaderData.room.name} | Rooms | Jenny's White Haven`
          : "Room Details | Jenny's White Haven",
      },
    ],
  }),
  component: PublicRoomDetailPage,
})

function PublicRoomDetailPage() {
  const { room, sections } = Route.useLoaderData()
  const { currency, isConverted, formatPrice } = useCurrency()
  const { t } = useI18n()
  const search = Route.useSearch()

  const contact = sections.find((s) => s.key === 'contact')
  const branding = sections.find((s) => s.key === 'branding')
  const [selectedImageIdx, setSelectedImageIdx] = useState(0)

  const [checkIn, setCheckIn] = useState(search.checkIn ?? '')
  const [checkOut, setCheckOut] = useState(search.checkOut ?? '')
  const [guestsCount, setGuestsCount] = useState(
    Math.min(search.guests ?? 2, room?.capacity ?? 2),
  )
  const [extraChildren, setExtraChildren] = useState(0)
  const [extraAdults, setExtraAdults] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    dates?: string | null
    firstName?: string | null
    lastName?: string | null
    phone?: string | null
    email?: string | null
    specialRequests?: string | null
  }>({})
  const [confirmation, setConfirmation] = useState<{
    bookingReference: string
    totalAmount: number
    nights: number
  } | null>(null)

  const validateBookingField = (
    field: keyof typeof fieldErrors,
    overrides?: {
      checkIn?: string
      checkOut?: string
      firstName?: string
      lastName?: string
      phone?: string
      email?: string
      specialRequests?: string
    },
  ): string | null => {
    switch (field) {
      case 'dates':
        return validateStayDatesRange(
          overrides?.checkIn ?? checkIn,
          overrides?.checkOut ?? checkOut,
          t.roomDetail.selectBothDatesError,
        )
      case 'firstName':
        return validatePersonName(overrides?.firstName ?? firstName, {
          label: t.validation.firstNameLabel,
          maxLength: 60,
          messages: t.validation,
        })
      case 'lastName':
        return validatePersonName(overrides?.lastName ?? lastName, {
          label: t.validation.lastNameLabel,
          maxLength: 60,
          messages: t.validation,
        })
      case 'phone':
        return validatePhoneField(overrides?.phone ?? phone, {
          required: true,
          messages: t.validation,
        })
      case 'email':
        return validateEmailField(overrides?.email ?? email, {
          required: false,
          label: t.validation.emailLabel,
          messages: t.validation,
        })
      case 'specialRequests':
        return validateTextField(overrides?.specialRequests ?? specialRequests, {
          label: t.validation.specialRequestsLabel,
          maxLength: 500,
          messages: t.validation,
        })
      default:
        return null
    }
  }

  if (!room) {
    return (
      <PublicLayout contactSection={contact} brandingSection={branding}>
        <div className="max-w-3xl mx-auto px-6 py-24 text-center space-y-4">
          <h1 className="text-3xl font-serif text-stone-900">
            {t.roomDetail.notFoundTitle}
          </h1>
          <p className="text-sm text-stone-600">
            {t.roomDetail.notFoundDesc}
          </p>
          <Link
            to="/rooms"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-stone-900 text-[#FAF8F4] text-xs uppercase tracking-[0.18em]"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.roomDetail.backToRooms}
          </Link>
        </div>
      </PublicLayout>
    )
  }

  const nights = computeStayNights(checkIn, checkOut)
  const extraCounts = { extraChildren, extraAdults }
  const extraAdultFeeRate = room.extraPersonFee
  const extraChildFeeRate = room.extraChildFee
  const baseRoomTotal = nights * room.pricePerNight
  const extraGuestsTotal = calculateExtraGuestsFee(
    extraCounts,
    { extraAdultFee: extraAdultFeeRate, extraChildFee: extraChildFeeRate },
    nights,
  )
  const estimatedTotal = baseRoomTotal + extraGuestsTotal
  const activeImage = room.images[selectedImageIdx] ?? room.images[0]

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!room) return

    const nextErrors = {
      dates: validateBookingField('dates'),
      firstName: validateBookingField('firstName'),
      lastName: validateBookingField('lastName'),
      phone: validateBookingField('phone'),
      email: validateBookingField('email'),
      specialRequests: validateBookingField('specialRequests'),
    }
    setFieldErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) {
      if (nextErrors.dates) {
        setError(nextErrors.dates)
      } else {
        setError(null)
      }
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const res = await createPublicBooking({
        data: {
          roomId: room.id,
          checkIn,
          checkOut,
          guestsCount,
          extraChildren,
          extraAdults,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone,
          email: email.trim() || undefined,
          specialRequests: specialRequests.trim() || undefined,
        },
      })
      setConfirmation({
        bookingReference: res.bookingReference,
        totalAmount: res.totalAmount,
        nights: res.nights,
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to submit reservation request.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PublicLayout contactSection={contact} brandingSection={branding}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 space-y-10">
        <Link
          to="/rooms"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-stone-600 hover:text-stone-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.roomDetail.allRooms}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left: Gallery & Details */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-3">
              <div className="aspect-[16/10] rounded-3xl overflow-hidden bg-stone-200">
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={room.name}
                    fetchPriority="high"
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs uppercase tracking-widest text-stone-400">
                    {t.common.roomNumber(room.roomNumber)}
                  </div>
                )}
              </div>

              {room.images.length > 1 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {room.images.map((src, idx) => (
                    <button
                      key={`${src}-${idx}`}
                      type="button"
                      onClick={() => setSelectedImageIdx(idx)}
                      className={`aspect-[4/3] rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                        idx === selectedImageIdx
                          ? 'border-stone-900'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={src}
                        alt={`${room.name} ${idx + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-amber-800 font-semibold">
                <span>{t.common.roomTypes[room.type]}</span>
                <span>·</span>
                <span>{t.common.roomNumber(room.roomNumber)}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {t.common.upToGuests(room.capacity)}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-serif text-stone-900">
                {room.name}
              </h1>

              {room.description && (
                <p className="text-base text-stone-600 leading-relaxed">
                  {room.description}
                </p>
              )}
            </div>

            {room.amenities.length > 0 && (
              <div className="pt-6 border-t border-stone-200/80 space-y-4">
                <h2 className="text-xs uppercase tracking-[0.22em] text-stone-500 font-semibold">
                  {t.roomDetail.roomAmenities}
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {room.amenities.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2.5 text-sm text-stone-800"
                    >
                      <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right: Reservation Form or Confirmation */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex items-baseline justify-between pb-4 border-b border-stone-100">
                <div>
                  <span className="text-2xl font-serif text-stone-900">
                    {formatPrice(room.pricePerNight)}
                  </span>
                  <span className="text-xs text-stone-500">
                    {' '}
                    {t.common.perNight}
                  </span>
                </div>
                <span className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
                  {t.common.maxGuests(room.capacity)}
                </span>
              </div>

              {confirmation ? (
                <div className="space-y-5">
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      {t.roomDetail.reservationReceived}
                    </div>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      {t.roomDetail.saveReferenceHint}
                    </p>
                    <div className="pt-2">
                      <div className="text-[11px] uppercase tracking-wider text-emerald-700">
                        {t.roomDetail.bookingReference}
                      </div>
                      <div className="text-2xl font-mono font-bold text-emerald-950 tracking-wider">
                        {confirmation.bookingReference}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-stone-50 border border-stone-200/70 p-4 space-y-2 text-xs text-stone-700">
                    <div className="flex justify-between">
                      <span>{t.roomDetail.duration}</span>
                      <span className="font-semibold">
                        {t.common.nightCount(confirmation.nights)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.roomDetail.totalStay}</span>
                      <span className="font-semibold text-right">
                        {formatPrice(confirmation.totalAmount)}
                        {isConverted && (
                          <span className="block text-[11px] font-normal text-stone-500">
                            {t.roomDetail.billedAsPhp(
                              formatPeso(confirmation.totalAmount),
                            )}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {contact?.metadata.paymentInfo && (
                    <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-4 text-xs text-amber-950 leading-relaxed">
                      <p className="font-semibold mb-1">
                        {t.roomDetail.paymentInstructions}
                      </p>
                      <p>{contact.metadata.paymentInfo}</p>
                    </div>
                  )}

                  <Link
                    to="/booking-status"
                    className="block w-full text-center py-3 px-4 rounded-xl bg-stone-900 text-[#FAF8F4] text-xs uppercase tracking-[0.18em] font-semibold hover:bg-amber-900 transition"
                  >
                    {t.roomDetail.trackBookingStatus}
                  </Link>
                </div>
              ) : (
                <form noValidate onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div
                      role="alert"
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700"
                    >
                      {error}
                    </div>
                  )}

                  <div>
                    <StayDateRangePicker
                      idPrefix="book"
                      checkIn={checkIn}
                      checkOut={checkOut}
                      bookedRanges={room.bookedRanges}
                      required
                      onChange={({ checkIn: nextIn, checkOut: nextOut }) => {
                        setCheckIn(nextIn)
                        setCheckOut(nextOut)
                        if (fieldErrors.dates) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            dates: validateBookingField('dates', {
                              checkIn: nextIn,
                              checkOut: nextOut,
                            }),
                          }))
                        }
                      }}
                    />
                    <FieldError
                      id="book-dates-error"
                      message={fieldErrors.dates}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="book-guests"
                      className="block text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1"
                    >
                      {t.roomDetail.includedGuests(room.capacity)}
                    </label>
                    <select
                      id="book-guests"
                      value={guestsCount}
                      onChange={(e) => setGuestsCount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-900"
                    >
                      {Array.from(
                        { length: room.capacity },
                        (_, i) => i + 1,
                      ).map((n) => (
                        <option key={n} value={n}>
                          {t.common.guestCount(n)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Additional Persons (Adult / Child) Mobile-Friendly Auto-Compute */}
                  <ExtraGuestsCounterField
                    idPrefix="book"
                    variant="public"
                    extraAdults={extraAdults}
                    extraChildren={extraChildren}
                    extraAdultFee={extraAdultFeeRate}
                    extraChildFee={extraChildFeeRate}
                    extraTotalFee={extraGuestsTotal}
                    maxPerCategory={15}
                    onChangeAdults={setExtraAdults}
                    onChangeChildren={setExtraChildren}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="book-first-name"
                        className="block text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1"
                      >
                        {t.roomDetail.firstName}
                      </label>
                      <input
                        id="book-first-name"
                        type="text"
                        required
                        maxLength={60}
                        aria-invalid={Boolean(fieldErrors.firstName)}
                        aria-describedby={
                          fieldErrors.firstName
                            ? 'book-first-name-error'
                            : undefined
                        }
                        value={firstName}
                        onChange={(e) => {
                          const next = e.target.value
                          setFirstName(next)
                          const msg = validateBookingField('firstName', {
                            firstName: next,
                          })
                          if (fieldErrors.firstName || /\p{N}/u.test(next)) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              firstName: msg,
                            }))
                          }
                        }}
                        onBlur={() =>
                          setFieldErrors((prev) => ({
                            ...prev,
                            firstName: validateBookingField('firstName'),
                          }))
                        }
                        className={getFieldValidationClass(
                          'w-full px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700',
                          Boolean(fieldErrors.firstName),
                        )}
                      />
                      <FieldError
                        id="book-first-name-error"
                        message={fieldErrors.firstName}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="book-last-name"
                        className="block text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1"
                      >
                        {t.roomDetail.lastName}
                      </label>
                      <input
                        id="book-last-name"
                        type="text"
                        required
                        maxLength={60}
                        aria-invalid={Boolean(fieldErrors.lastName)}
                        aria-describedby={
                          fieldErrors.lastName
                            ? 'book-last-name-error'
                            : undefined
                        }
                        value={lastName}
                        onChange={(e) => {
                          const next = e.target.value
                          setLastName(next)
                          const msg = validateBookingField('lastName', {
                            lastName: next,
                          })
                          if (fieldErrors.lastName || /\p{N}/u.test(next)) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              lastName: msg,
                            }))
                          }
                        }}
                        onBlur={() =>
                          setFieldErrors((prev) => ({
                            ...prev,
                            lastName: validateBookingField('lastName'),
                          }))
                        }
                        className={getFieldValidationClass(
                          'w-full px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700',
                          Boolean(fieldErrors.lastName),
                        )}
                      />
                      <FieldError
                        id="book-last-name-error"
                        message={fieldErrors.lastName}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="book-phone"
                      className="block text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1"
                    >
                      {t.roomDetail.mobilePhone}
                    </label>
                    <PhoneNumberInput
                      id="book-phone"
                      required
                      variant="public"
                      invalid={Boolean(fieldErrors.phone)}
                      ariaDescribedBy={
                        fieldErrors.phone ? 'book-phone-error' : undefined
                      }
                      value={phone}
                      onChange={(next) => {
                        setPhone(next)
                        if (fieldErrors.phone) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            phone: validateBookingField('phone', {
                              phone: next,
                            }),
                          }))
                        }
                      }}
                      onBlur={() =>
                        setFieldErrors((prev) => ({
                          ...prev,
                          phone: validateBookingField('phone'),
                        }))
                      }
                    />
                    <FieldError
                      id="book-phone-error"
                      message={fieldErrors.phone}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="book-email"
                      className="block text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1"
                    >
                      {t.roomDetail.emailOptional}
                    </label>
                    <input
                      id="book-email"
                      type="email"
                      maxLength={254}
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={
                        fieldErrors.email ? 'book-email-error' : undefined
                      }
                      value={email}
                      onChange={(e) => {
                        const next = e.target.value
                        setEmail(next)
                        if (fieldErrors.email) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            email: validateBookingField('email', {
                              email: next,
                            }),
                          }))
                        }
                      }}
                      onBlur={() =>
                        setFieldErrors((prev) => ({
                          ...prev,
                          email: validateBookingField('email'),
                        }))
                      }
                      className={getFieldValidationClass(
                        'w-full px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700',
                        Boolean(fieldErrors.email),
                      )}
                    />
                    <FieldError
                      id="book-email-error"
                      message={fieldErrors.email}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="book-requests"
                      className="block text-[11px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1"
                    >
                      {t.roomDetail.specialRequests}
                    </label>
                    <textarea
                      id="book-requests"
                      rows={2}
                      maxLength={500}
                      aria-invalid={Boolean(fieldErrors.specialRequests)}
                      aria-describedby={
                        fieldErrors.specialRequests
                          ? 'book-requests-error'
                          : undefined
                      }
                      value={specialRequests}
                      onChange={(e) => {
                        const next = e.target.value
                        setSpecialRequests(next)
                        if (fieldErrors.specialRequests) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            specialRequests: validateBookingField(
                              'specialRequests',
                              { specialRequests: next },
                            ),
                          }))
                        }
                      }}
                      onBlur={() =>
                        setFieldErrors((prev) => ({
                          ...prev,
                          specialRequests:
                            validateBookingField('specialRequests'),
                        }))
                      }
                      placeholder={t.roomDetail.specialRequestsPlaceholder}
                      className={getFieldValidationClass(
                        'w-full px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700',
                        Boolean(fieldErrors.specialRequests),
                      )}
                    />
                    <FieldError
                      id="book-requests-error"
                      message={fieldErrors.specialRequests}
                    />
                  </div>

                  {nights > 0 && (
                    <div className="rounded-2xl bg-stone-50 border border-stone-200/70 p-4 space-y-1.5 text-xs">
                      <div className="flex justify-between gap-2 text-stone-600">
                        <span>
                          {formatPrice(room.pricePerNight)} ×{' '}
                          {t.common.nightCount(nights)}
                        </span>
                        <span className="whitespace-nowrap">
                          {formatPrice(baseRoomTotal)}
                        </span>
                      </div>
                      {extraAdults > 0 && (
                        <div className="flex justify-between gap-2 text-amber-900">
                          <span>
                            {t.roomDetail.extraAdultsSummary(extraAdults)} ×{' '}
                            {formatPrice(extraAdultFeeRate)} × {nights}n
                          </span>
                          <span className="whitespace-nowrap">
                            +
                            {formatPrice(
                              extraAdults * extraAdultFeeRate * nights,
                            )}
                          </span>
                        </div>
                      )}
                      {extraChildren > 0 && (
                        <div className="flex justify-between gap-2 text-amber-900">
                          <span>
                            {t.roomDetail.extraChildrenSummary(extraChildren)} ×{' '}
                            {formatPrice(extraChildFeeRate)} × {nights}n
                          </span>
                          <span className="whitespace-nowrap">
                            +
                            {formatPrice(
                              extraChildren * extraChildFeeRate * nights,
                            )}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between gap-2 font-semibold text-stone-900 pt-1.5 border-t border-stone-200/70">
                        <span>{t.roomDetail.totalStay}</span>
                        <span className="whitespace-nowrap">
                          {formatPrice(estimatedTotal)}
                        </span>
                      </div>
                      {isConverted && (
                        <p className="text-[11px] text-stone-500 pt-1 leading-snug">
                          {t.roomDetail.approxCurrencyNote(
                            currency,
                            formatPeso(estimatedTotal),
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-stone-900 hover:bg-amber-900 text-[#FAF8F4] text-xs uppercase tracking-[0.18em] font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {isSubmitting
                      ? t.roomDetail.submittingRequest
                      : t.roomDetail.requestReservation}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
