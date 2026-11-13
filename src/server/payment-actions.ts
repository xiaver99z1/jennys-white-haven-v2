import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/lib/prisma'
import { logActivity } from '#/lib/logger'
import { authSession } from '#/lib/auth-helpers'
import { requirePermission } from '#/server/room-actions'
import { createNotification } from '#/server/notification-actions'
import { formatPeso } from '#/lib/formatters'
import type { PaymentMethod, PaymentStatus } from '#/types'

export interface RecordPaymentInput {
  bookingId: string
  amount: number
  method: PaymentMethod | string
  referenceNo?: string
  notes?: string
}

export function computePaymentStatus(
  amountPaid: number,
  totalAmount: number,
): PaymentStatus {
  if (amountPaid <= 0) return 'UNPAID'
  if (amountPaid >= totalAmount) return 'PAID'
  return 'PARTIAL'
}

export async function getBookingPaymentsHandler({
  data,
}: {
  data: { bookingId: string }
}) {
  await requirePermission('view:bookings')

  const payments = await prisma.payment.findMany({
    where: { bookingId: data.bookingId },
    orderBy: { paidAt: 'desc' },
    include: {
      receivedBy: {
        select: { name: true },
      },
    },
  })

  return {
    success: true,
    payments: payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
    })),
  }
}

export function validateBookingId(data: { bookingId: string }) {
  return data
}

export const getBookingPayments = createServerFn({ method: 'GET' })
  .validator(validateBookingId)
  .handler(getBookingPaymentsHandler)

export async function recordPaymentHandler({
  data,
}: {
  data: RecordPaymentInput
}) {
  const admin = await requirePermission('update:bookings')

  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error('Payment amount must be greater than 0.')
  }

  const amountCents = Math.round(data.amount * 100)
  if (Math.abs(data.amount * 100 - amountCents) > 1e-6) {
    throw new Error('Payment amount cannot have more than 2 decimal places.')
  }

  const session = await authSession()

  const { booking, payment, newAmountPaid, newPaymentStatus } =
    await prisma.$transaction(
      async (tx) => {
        const foundBooking = await tx.booking.findUnique({
          where: { id: data.bookingId },
        })

        if (!foundBooking || foundBooking.deletedAt) {
          throw new Error('Booking not found.')
        }

        const totalCents = Math.round(Number(foundBooking.totalAmount) * 100)
        const existingPaidCents = Math.round(
          Number(foundBooking.amountPaid) * 100,
        )
        const nextPaidCents = existingPaidCents + amountCents
        const computedAmountPaid = nextPaidCents / 100
        const computedPaymentStatus = computePaymentStatus(
          nextPaidCents,
          totalCents,
        )

        const created = await tx.payment.create({
          data: {
            bookingId: data.bookingId,
            amount: amountCents / 100,
            method: data.method,
            referenceNo: data.referenceNo?.trim() || null,
            notes: data.notes?.trim() || null,
            receivedById: admin.id,
          },
          include: {
            receivedBy: { select: { name: true } },
          },
        })

        await tx.booking.update({
          where: { id: data.bookingId },
          data: {
            amountPaid: computedAmountPaid,
            paymentStatus: computedPaymentStatus,
            paymentMethod: data.method,
          },
        })

        return {
          booking: foundBooking,
          payment: created,
          newAmountPaid: computedAmountPaid,
          newPaymentStatus: computedPaymentStatus,
        }
      },
      { isolationLevel: 'Serializable' },
    )

  await logActivity({
    userId: admin.id,
    action: 'PAYMENT_RECORDED',
    description: `Recorded ${formatPeso(data.amount)} (${data.method}) for booking ${booking.bookingReference}`,
    ipAddress: session.session.ipAddress ?? null,
    userAgent: session.session.userAgent ?? null,
  })

  await createNotification({
    type: 'PAYMENT_RECORDED',
    title: `Payment Recorded: ${formatPeso(data.amount)}`,
    message: `${data.method} payment for ${booking.bookingReference}`,
    href: '/admin/bookings',
  })

  return {
    success: true,
    payment: {
      ...payment,
      amount: Number(payment.amount),
    },
    amountPaid: newAmountPaid,
    paymentStatus: newPaymentStatus,
  }
}

export function validateRecordPayment(data: RecordPaymentInput) {
  return data
}

export const recordPayment = createServerFn({ method: 'POST' })
  .validator(validateRecordPayment)
  .handler(recordPaymentHandler)
