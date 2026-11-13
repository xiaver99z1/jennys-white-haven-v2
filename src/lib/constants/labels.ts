import type { BookingStatus, PaymentStatus, RoomStatus, StatusMeta } from '#/types'

export const DEFAULT_BADGE_CLASS =
  'bg-stone-100 text-stone-700 border-stone-200'

export const BOOKING_STATUS_META: Record<BookingStatus, StatusMeta> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  CONFIRMED: {
    label: 'Confirmed',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  CHECKED_IN: {
    label: 'Checked In',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  CHECKED_OUT: {
    label: 'Checked Out',
    className: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
}

export const PAYMENT_STATUS_META: Record<PaymentStatus, StatusMeta> = {
  UNPAID: {
    label: 'Unpaid',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  PARTIAL: {
    label: 'Partial',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  PAID: {
    label: 'Paid',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  REFUNDED: {
    label: 'Refunded',
    className: 'bg-stone-100 text-stone-700 border-stone-200',
  },
}

export const ROOM_STATUS_META: Record<RoomStatus, StatusMeta> = {
  AVAILABLE: {
    label: 'Available',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  OCCUPIED: {
    label: 'Occupied',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  CLEANING: {
    label: 'Cleaning',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
}

export const ROLE_BADGE_CLASSES: Record<string, string> = {
  owner: 'bg-amber-100 text-amber-900 border-amber-300',
  manager: 'bg-sky-100 text-sky-900 border-sky-300',
  receptionist: 'bg-teal-100 text-teal-900 border-teal-300',
}

export const DEFAULT_ROLE_BADGE_CLASS =
  'bg-stone-100 text-stone-700 border-stone-300'

export const SHORT_MONTH_NAMES = [
  'Jan.',
  'Feb.',
  'Mar.',
  'Apr.',
  'May',
  'Jun.',
  'Jul.',
  'Aug.',
  'Sep.',
  'Oct.',
  'Nov.',
  'Dec.',
] as const

export const ADMIN_LABELS = {
  common: {
    cancel: 'Cancel',
    save: 'Save Changes',
    saving: 'Saving...',
    deleting: 'Deleting...',
    restoring: 'Restoring...',
    processing: 'Processing...',
    viewAll: 'View all',
    somethingWentWrong: 'Something went wrong',
  },
  dashboard: {
    title: 'Dashboard',
    subtitle: "Welcome back to Jenny's White Haven Admin",
    todayPrefix: 'Today',
    arrivals: "Today's Arrivals",
    departures: "Today's Departures",
    expectedCheckIns: 'Expected check-ins',
    expectedCheckOuts: 'Expected check-outs',
    occupiedRooms: 'Occupied Rooms',
    availableRooms: 'Available Rooms',
    bookedRevenue: 'Booked Revenue (This Month)',
    collected: 'Collected (This Month)',
    paymentsReceived: 'Payments received',
    balanceDue: 'Balance Due (This Month)',
    stillToBeCollected: 'Still to be collected',
    recentBookings: 'Recent Bookings',
    balancesDue: 'Balances Due',
    checkIn: 'Check In',
    checkOut: 'Check Out',
    noArrivals: 'No arrivals scheduled for today.',
    noDepartures: 'No departures scheduled for today.',
    noBookings: 'No bookings recorded yet.',
    noBalances: 'All balances are settled.',
    confirmCheckInTitle: 'Check in guest?',
    confirmCheckOutTitle: 'Check out guest?',
    confirmCheckInButton: 'Yes, Check In',
    confirmCheckOutButton: 'Yes, Check Out',
  },
  bookings: {
    title: 'Bookings Management',
    subtitle:
      'Manage staycation reservations, check-ins, check-outs, and payments',
    addButton: 'New Booking',
    searchPlaceholder: 'Search by reference (JWH-...), guest name, or room...',
    allFilter: 'All Bookings',
    viewActive: 'View Active Bookings',
    viewArchived: 'View Archived Bookings',
    editButton: 'Edit Booking',
    restoreButton: 'Restore Booking',
    emptyActiveTitle: 'No bookings found',
    emptyArchivedTitle: 'No archived bookings',
    emptyActiveDescription:
      'Create a new booking or adjust your search filters.',
    emptyArchivedDescription:
      'Cancelled or deleted bookings moved to archive will appear here.',
  },
  rooms: {
    title: 'Rooms Management',
    subtitle:
      'Manage room inventories, pricing, photo galleries, and amenities checklists.',
    addButton: 'Add Room',
    searchPlaceholder: 'Search by room number, name, type...',
    allFilter: 'ALL',
    viewActive: 'View Active Rooms',
    viewArchived: 'View Archived Rooms',
    editButton: 'Edit Room',
    restoreButton: 'Restore Room',
    emptyActiveTitle: 'No rooms found',
    emptyArchivedTitle: 'No archived rooms',
    emptyActiveDescription:
      'Add your first resort room or adjust your search filters.',
    emptyArchivedDescription: 'Deleted rooms moved to archive will appear here.',
  },
  guests: {
    title: 'Guests Management',
    subtitle:
      'Manage guest profiles, contact details, ID verification records, and VIP preferences.',
    addButton: 'Add Guest',
    searchPlaceholder: 'Search by guest name, phone, email, ID...',
    allFilter: 'ALL',
    viewActive: 'View Active Guests',
    viewArchived: 'View Archived Guests',
    editButton: 'Edit Guest',
    restoreButton: 'Restore Guest',
    emptyActiveTitle: 'No guests found',
    emptyArchivedTitle: 'No archived guests',
    emptyActiveDescription:
      'Add your first guest profile or adjust your search filters.',
    emptyArchivedDescription:
      'Deleted guests moved to archive will appear here.',
  },
} as const
