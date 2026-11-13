import { useState } from 'react'
import {
  LogIn,
  LogOut,
  BedDouble,
  DoorOpen,
  Wallet,
  CircleDollarSign,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { checkInBooking, checkOutBooking } from '#/server/dashboard-actions'
import type {
  DashboardBooking,
  DashboardStats,
  QuickAction,
} from '#/types'
import { ConfirmModal } from '#/components/common/ConfirmModal'
import { EmptyState } from '#/components/common/EmptyState'
import { Panel } from '#/components/common/Panel'
import { StatCard } from '#/components/common/StatCard'
import { StatusBadge } from '#/components/common/StatusBadge'
import {
  formatDate,
  formatFullName,
  formatPeso,
  getBookingStatusMeta,
  getPaymentStatusMeta,
} from '#/lib/formatters'

export type { DashboardBooking, DashboardStats }

interface AdminDashboardProps {
  stats: DashboardStats
  router: any
}

const guestName = (b: DashboardBooking) =>
  formatFullName(b.guest.firstName, b.guest.lastName)

export function AdminDashboard({ stats, router }: AdminDashboardProps) {
  const [pendingAction, setPendingAction] = useState<QuickAction | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { rooms, revenue, canUpdateBookings } = stats
  const occupancyRate =
    rooms.total > 0 ? Math.round((rooms.occupied / rooms.total) * 100) : 0

  const handleConfirmAction = async () => {
    const { type, booking } = pendingAction!
    setPendingAction(null)
    setProcessingId(booking.id)
    setActionError(null)

    try {
      const action = type === 'checkin' ? checkInBooking : checkOutBooking
      await action({ data: { id: booking.id } })
      await router.invalidate()
    } catch (err: any) {
      setActionError(err.message || 'Action failed. Please try again.')
    } finally {
      setProcessingId(null)
    }
  }

  const isCheckOut = pendingAction?.type === 'checkout'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Welcome back to Jenny&apos;s White Haven Admin
          </p>
        </div>
        <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          Today · {stats.today}
        </span>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {actionError}
        </div>
      )}

      {/* Today & Rooms KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Arrivals"
          value={String(stats.arrivals.length)}
          hint="Expected check-ins"
          icon={<LogIn className="w-5 h-5" />}
          accent="bg-sky-50 text-sky-700 border-sky-200"
        />
        <StatCard
          title="Today's Departures"
          value={String(stats.departures.length)}
          hint="Expected check-outs"
          icon={<LogOut className="w-5 h-5" />}
          accent="bg-amber-50 text-amber-800 border-amber-200"
        />
        <StatCard
          title="Occupied Rooms"
          value={`${rooms.occupied} / ${rooms.total}`}
          hint={`${occupancyRate}% occupancy`}
          icon={<BedDouble className="w-5 h-5" />}
          accent="bg-emerald-50 text-emerald-700 border-emerald-200"
        />
        <StatCard
          title="Available Rooms"
          value={String(rooms.available)}
          hint={`${rooms.cleaning} cleaning · ${rooms.maintenance} maintenance`}
          icon={<DoorOpen className="w-5 h-5" />}
          accent="bg-stone-50 text-stone-700 border-stone-200"
        />
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Booked Revenue (This Month)"
          value={formatPeso(revenue.monthTotal)}
          hint={`${revenue.monthBookings} booking(s) checking in this month`}
          icon={<CircleDollarSign className="w-5 h-5" />}
          accent="bg-amber-50 text-amber-900 border-amber-200"
        />
        <StatCard
          title="Paid (This Month's Stays)"
          value={formatPeso(revenue.monthPaid)}
          hint="Paid on bookings checking in this month"
          icon={<Wallet className="w-5 h-5" />}
          accent="bg-emerald-50 text-emerald-700 border-emerald-200"
        />
        <StatCard
          title="Balance Due (This Month)"
          value={formatPeso(revenue.monthBalanceDue)}
          hint="Still to be collected on this month's stays"
          icon={<AlertCircle className="w-5 h-5" />}
          accent="bg-rose-50 text-rose-700 border-rose-200"
        />
      </div>

      {/* Today's Arrivals & Departures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Today's Arrivals" count={stats.arrivals.length}>
          {stats.arrivals.length === 0 ? (
            <EmptyState message="No arrivals scheduled for today." />
          ) : (
            stats.arrivals.map((booking) => {
              const canCheckIn =
                canUpdateBookings &&
                (booking.status === 'PENDING' || booking.status === 'CONFIRMED')
              return (
                <BookingRow key={booking.id} booking={booking}>
                  {canCheckIn ? (
                    <ActionButton
                      label="Check In"
                      isProcessing={processingId === booking.id}
                      disabled={processingId !== null}
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() =>
                        setPendingAction({ type: 'checkin', booking })
                      }
                    />
                  ) : (
                    <StatusBadge
                      size="xs"
                      {...getBookingStatusMeta(booking.status)}
                    />
                  )}
                </BookingRow>
              )
            })
          )}
        </Panel>

        <Panel title="Today's Departures" count={stats.departures.length}>
          {stats.departures.length === 0 ? (
            <EmptyState message="No departures scheduled for today." />
          ) : (
            stats.departures.map((booking) => (
              <BookingRow key={booking.id} booking={booking}>
                {canUpdateBookings && booking.status === 'CHECKED_IN' ? (
                  <ActionButton
                    label="Check Out"
                    isProcessing={processingId === booking.id}
                    disabled={processingId !== null}
                    className="bg-amber-700 hover:bg-amber-800"
                    onClick={() =>
                      setPendingAction({ type: 'checkout', booking })
                    }
                  />
                ) : (
                  <StatusBadge
                    size="xs"
                    {...getBookingStatusMeta(booking.status)}
                  />
                )}
              </BookingRow>
            ))
          )}
        </Panel>
      </div>

      {/* Recent Bookings & Outstanding Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Panel
            title="Recent Bookings"
            action={
              <button
                type="button"
                onClick={() => router.navigate({ to: '/admin/bookings' })}
                className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
          >
            {stats.recentBookings.length === 0 ? (
              <EmptyState message="No bookings yet. They will appear here once guests start booking." />
            ) : (
              stats.recentBookings.map((booking) => (
                <BookingRow key={booking.id} booking={booking} showDates>
                  <div className="text-right space-y-1">
                    <div className="text-xs font-bold text-stone-900">
                      {formatPeso(booking.totalAmount)}
                    </div>
                    <StatusBadge
                      size="xs"
                      {...getBookingStatusMeta(booking.status)}
                    />
                  </div>
                </BookingRow>
              ))
            )}
          </Panel>
        </div>

        <Panel title="Balances Due" count={stats.outstandingCount}>
          {stats.outstanding.length === 0 ? (
            <EmptyState message="All bookings are fully paid." />
          ) : (
            stats.outstanding.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-stone-800 truncate">
                    {guestName(booking)}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {booking.bookingReference} · Room {booking.room.roomNumber}
                  </div>
                </div>
                <div className="text-right space-y-1 shrink-0">
                  <div className="text-xs font-bold text-rose-700">
                    {formatPeso(
                      Math.max(booking.totalAmount - booking.amountPaid, 0),
                    )}
                  </div>
                  <StatusBadge
                    size="xs"
                    {...getPaymentStatusMeta(booking.paymentStatus)}
                  />
                </div>
              </div>
            ))
          )}
        </Panel>
      </div>

      <ConfirmModal
        isOpen={pendingAction !== null}
        variant={isCheckOut ? 'amber' : 'success'}
        title={isCheckOut ? 'Check Out Guest?' : 'Check In Guest?'}
        description={
          pendingAction
            ? isCheckOut
              ? `Check out ${guestName(pendingAction.booking)} from Room ${pendingAction.booking.room.roomNumber}? The room will be marked for cleaning.`
              : `Check in ${guestName(pendingAction.booking)} to Room ${pendingAction.booking.room.roomNumber}? The room will be marked as occupied.`
            : ''
        }
        confirmText={isCheckOut ? 'Yes, Check Out' : 'Yes, Check In'}
        cancelText="Cancel"
        onConfirm={handleConfirmAction}
        onClose={() => setPendingAction(null)}
      />
    </div>
  )
}

function BookingRow({
  booking,
  showDates = false,
  children,
}: {
  booking: DashboardBooking
  showDates?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-stone-800 truncate">
          {guestName(booking)}
        </div>
        <div className="text-[11px] text-stone-500">
          {booking.bookingReference} · Room {booking.room.roomNumber} ·{' '}
          {booking.guestsCount} guest(s)
        </div>
        {showDates && (
          <div className="text-[11px] text-stone-400">
            {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)} ·{' '}
            {booking.nights} night(s)
          </div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function ActionButton({
  label,
  isProcessing,
  disabled,
  className,
  onClick,
}: {
  label: string
  isProcessing: boolean
  disabled: boolean
  className: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white font-semibold rounded-xl text-xs transition shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isProcessing ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Processing...
        </>
      ) : (
        label
      )}
    </button>
  )
}
