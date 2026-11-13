import { useEffect, useState } from 'react'
import { X, Receipt, Plus, Loader2 } from 'lucide-react'
import type {
  BookingItem,
  PaymentItem,
  PaymentMethod,
  PaymentStatus,
} from '#/types'
import { PAYMENT_METHODS } from '#/lib/constants/rooms'
import {
  formatPeso,
  formatShortDate,
  getErrorMessage,
  getPaymentStatusMeta,
} from '#/lib/formatters'
import { StatusBadge } from '#/components/common/StatusBadge'
import { EmptyState } from '#/components/common/EmptyState'
import { getBookingPayments, recordPayment } from '#/server/payment-actions'

interface PaymentHistoryModalProps {
  isOpen: boolean
  booking: BookingItem | null
  onClose: () => void
  onSuccess: () => Promise<void> | void
}

export function PaymentHistoryModal({
  isOpen,
  booking,
  onClose,
  onSuccess,
}: PaymentHistoryModalProps) {
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [summary, setSummary] = useState<{
    amountPaid: number
    paymentStatus: PaymentStatus
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRetryingRefresh, setIsRetryingRefresh] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [referenceNo, setReferenceNo] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!isOpen || !booking) return

    let active = true
    setIsLoading(true)
    setPayments([])
    setError(null)
    setLoadError(null)
    setRefreshError(null)
    setSummary(null)

    const remaining = Math.max(
      Number(booking.totalAmount) - Number(booking.amountPaid),
      0,
    )
    setAmount(remaining > 0 ? String(remaining) : '')
    setReferenceNo('')
    setNotes('')

    getBookingPayments({ data: { bookingId: booking.id } })
      .then((res) => {
        if (active) {
          setPayments(res.payments)
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setLoadError(getErrorMessage(err, 'Failed to load payment history.'))
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [isOpen, booking?.id])

  useEffect(() => {
    setSummary(null)
  }, [booking?.amountPaid, booking?.paymentStatus, booking?.totalAmount])

  if (!isOpen || !booking) return null

  const totalAmount = Number(booking.totalAmount)
  const amountPaid = summary?.amountPaid ?? Number(booking.amountPaid)
  const balanceDue = Math.max(totalAmount - amountPaid, 0)
  const paymentMeta = getPaymentStatusMeta(
    summary?.paymentStatus ?? booking.paymentStatus,
  )

  const handleRetryRefresh = async () => {
    setIsRetryingRefresh(true)
    try {
      await onSuccess()
      setRefreshError(null)
    } catch (err) {
      setRefreshError(
        getErrorMessage(
          err,
          'Payment recorded, but failed to refresh the bookings list.',
        ),
      )
    } finally {
      setIsRetryingRefresh(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading || isSubmitting) return

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid payment amount greater than 0.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setRefreshError(null)

    try {
      const res = await recordPayment({
        data: {
          bookingId: booking.id,
          amount: parsedAmount,
          method,
          referenceNo: referenceNo || undefined,
          notes: notes || undefined,
        },
      })
      setPayments((prev) => [
        res.payment,
        ...prev.filter((p) => p.id !== res.payment.id),
      ])
      setSummary({
        amountPaid: res.amountPaid,
        paymentStatus: res.paymentStatus,
      })
      const nextRemaining = Math.max(totalAmount - res.amountPaid, 0)
      setAmount(nextRemaining > 0 ? String(nextRemaining) : '')
      setReferenceNo('')
      setNotes('')

      try {
        await onSuccess()
      } catch (refreshErr) {
        setRefreshError(
          getErrorMessage(
            refreshErr,
            'Payment recorded, but failed to refresh the bookings list.',
          ),
        )
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to record payment.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Payments & Receipts
              </h2>
              <p className="text-xs text-stone-500">
                {booking.bookingReference} · {booking.guest.firstName}{' '}
                {booking.guest.lastName}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close payment modal"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary */}
        <div className="px-6 py-3 bg-stone-50/70 border-b border-stone-100 grid grid-cols-3 gap-3 text-xs">
          <div>
            <div className="text-stone-500">Total Bill</div>
            <div className="font-bold text-stone-900 text-sm">
              {formatPeso(totalAmount)}
            </div>
          </div>
          <div>
            <div className="text-stone-500">Total Paid</div>
            <div className="font-bold text-emerald-700 text-sm">
              {formatPeso(amountPaid)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-stone-500">Balance Due</div>
            <div className="flex items-center justify-end gap-1.5">
              <span className="font-bold text-rose-700 text-sm">
                {formatPeso(balanceDue)}
              </span>
              <StatusBadge size="xs" {...paymentMeta} />
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {error ? (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          ) : null}

          {/* Record Payment Form */}
          <form
            noValidate
            onSubmit={handleSubmit}
            className="space-y-3 p-4 rounded-xl border border-stone-200 bg-stone-50/40"
          >
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Record New Payment
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label
                  htmlFor="payment-amount"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Amount (₱)
                </label>
                <input
                  id="payment-amount"
                  type="number"
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/30"
                />
              </div>
              <div>
                <label
                  htmlFor="payment-method"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Method
                </label>
                <select
                  id="payment-method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/30"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label
                  htmlFor="payment-ref"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Reference No. (Optional)
                </label>
                <input
                  id="payment-ref"
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="GCash / Bank ref"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/30"
                />
              </div>
              <div>
                <label
                  htmlFor="payment-notes"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Notes (Optional)
                </label>
                <input
                  id="payment-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Deposit, Balance"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-600/30"
                />
              </div>
            </div>
            {refreshError && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-2">
                <span>{refreshError}</span>
                <button
                  type="button"
                  disabled={isRetryingRefresh}
                  onClick={handleRetryRefresh}
                  className="px-2 py-1 rounded-md bg-amber-800 text-white font-semibold hover:bg-amber-900 transition cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isRetryingRefresh ? 'Retrying...' : 'Retry refresh'}
                </button>
              </div>
            )}
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-900 hover:bg-amber-950 text-white text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Record Payment
                </>
              )}
            </button>
          </form>

          {/* Payment History */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Receipt History
            </h3>
            {isLoading ? (
              <div className="py-6 flex justify-center text-stone-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : loadError ? (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {loadError}
              </div>
            ) : payments.length === 0 ? (
              <EmptyState message="No payments recorded for this booking yet." />
            ) : (
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 text-xs bg-white"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-stone-900">
                        {p.method}
                        {p.referenceNo ? ` · Ref: ${p.referenceNo}` : ''}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {formatShortDate(p.paidAt)}
                        {p.receivedBy?.name
                          ? ` · By ${p.receivedBy.name}`
                          : ''}
                      </div>
                      {p.notes ? (
                        <div className="text-[11px] text-stone-400 truncate">
                          {p.notes}
                        </div>
                      ) : null}
                    </div>
                    <div className="font-bold text-emerald-700 shrink-0">
                      +{formatPeso(p.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
