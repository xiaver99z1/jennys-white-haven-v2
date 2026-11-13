import type { ROLES } from '#/lib/permissions'

export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'CLEANING'

export type RoomType = 'Standard' | 'Deluxe' | 'Suite' | 'Villa'

export type GuestIdType =
  | 'Passport'
  | "Driver's License"
  | 'National ID'
  | 'SSS / GSIS ID'
  | 'Postal ID'
  | 'Voter ID'
  | 'Other'

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED'

export type PaymentMethod = 'CASH' | 'GCASH' | 'BANK_TRANSFER' | 'CARD'

export interface AmenityCategory {
  category: string
  headerBg: string
  borderColor: string
  items: readonly string[]
}

export type Role = keyof typeof ROLES

export type Permission = (typeof ROLES)[Role][number]

export type ResortRole = 'OWNER' | 'MANAGER' | 'RECEPTIONIST'

export type ProfileActionType =
  | 'UPDATE_PROFILE'
  | 'CHANGE_PASSWORD'
  | 'CHANGE_EMAIL'

export interface AdminRouter {
  invalidate: () => Promise<void>
}

export interface StatusMeta {
  label: string
  className: string
}

export interface User {
  id: string
  name: string
  email: string
  emailVerified: boolean | Date | null
  image: string | null
  role: string | null
  banned: boolean | null
  createdAt: Date | string
  updatedAt: Date | string
}

export interface RoomItem {
  id: string
  roomNumber: string
  name: string
  type: RoomType | string
  pricePerNight: number | string
  maxCapacity: number
  status: RoomStatus | string
  description?: string | null
  amenities?: string[]
  images?: string[]
  deletedAt?: Date | string | null
}

export interface GuestItem {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  phone: string
  idType?: string | null
  idNumber?: string | null
  nationality?: string | null
  specialNotes?: string | null
  deletedAt?: Date | string | null
}

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

export interface BookingItem {
  id: string
  bookingReference: string
  guestId: string
  roomId: string
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
  guest: {
    id: string
    firstName: string
    lastName: string
    phone: string
    email?: string | null
  }
  room: {
    id: string
    roomNumber: string
    name: string
    type: string
    pricePerNight: number
  }
}

export interface DashboardBooking {
  id: string
  bookingReference: string
  checkIn: Date | string
  checkOut: Date | string
  nights: number
  guestsCount: number
  totalAmount: number
  amountPaid: number
  paymentStatus: string
  status: string
  room: {
    roomNumber: string
    name: string
  }
  guest: {
    firstName: string
    lastName: string
    phone: string
  }
}

export interface DashboardStats {
  today: string
  canUpdateBookings: boolean
  arrivals: DashboardBooking[]
  departures: DashboardBooking[]
  rooms: {
    total: number
    available: number
    occupied: number
    cleaning: number
    maintenance: number
  }
  recentBookings: DashboardBooking[]
  outstanding: DashboardBooking[]
  outstandingCount: number
  revenue: {
    monthTotal: number
    monthPaid: number
    monthBalanceDue: number
    monthBookings: number
  }
}

export type QuickAction = {
  type: 'checkin' | 'checkout'
  booking: DashboardBooking
}

export interface PaymentItem {
  id: string
  bookingId: string
  amount: number
  method: PaymentMethod | string
  referenceNo?: string | null
  notes?: string | null
  paidAt: Date | string
  receivedBy?: {
    name: string
  } | null
}

export interface GlobalSearchResults {
  bookings: Array<{
    id: string
    bookingReference: string
    guestName: string
    roomLabel: string
    status: string
  }>
  guests: Array<{
    id: string
    name: string
    phone: string
    email?: string | null
  }>
  rooms: Array<{
    id: string
    roomNumber: string
    name: string
    type: string
    status: string
  }>
}

export interface AdminNotificationItem {
  id: string
  type: 'arrival' | 'departure' | 'balance'
  title: string
  subtitle: string
  href: '/admin' | '/admin/bookings'
}

export interface AdminNotificationsData {
  totalCount: number
  items: AdminNotificationItem[]
}

export interface NotificationRecord {
  id: string
  type: string
  title: string
  message: string
  href: string
  isRead: boolean
  readAt?: Date | string | null
  createdAt: Date | string
}

export interface NotificationsResponse {
  unreadCount: number
  items: NotificationRecord[]
}

export type ReportPreset =
  | 'today'
  | 'last7'
  | 'thisMonth'
  | 'lastMonth'
  | 'last90'
  | 'all'
  | 'custom'

export interface ReportDateRangeInput {
  from?: string
  to?: string
  preset?: ReportPreset
}

export interface ReportRangeMeta {
  from: string
  to: string
  preset: ReportPreset
  dayCount: number
}

export interface RevenueReportData {
  range: ReportRangeMeta
  kpis: {
    totalCollected: number
    totalBilled: number
    outstandingBalance: number
    collectionRate: number
    paymentCount: number
  }
  byMethod: Array<{
    method: string
    amount: number
    count: number
    share: number
  }>
  dailyTrend: Array<{
    date: string
    amount: number
    count: number
  }>
  recentPayments: Array<{
    id: string
    bookingId: string
    bookingReference: string
    guestName: string
    amount: number
    method: string
    referenceNo: string | null
    paidAt: Date | string
    receivedByName: string | null
  }>
  outstandingBookings: Array<{
    id: string
    bookingReference: string
    guestName: string
    roomNumber: string
    checkIn: Date | string
    totalAmount: number
    amountPaid: number
    balanceDue: number
    paymentStatus: PaymentStatus
  }>
}

export interface OccupancyReportData {
  range: ReportRangeMeta
  kpis: {
    occupancyRate: number
    occupiedRoomNights: number
    availableRoomNights: number
    adr: number
    revPar: number
    totalRoomRevenue: number
    activeRoomCount: number
  }
  byRoomType: Array<{
    type: RoomType
    roomCount: number
    nightsSold: number
    availableNights: number
    occupancyRate: number
    revenue: number
  }>
  byRoom: Array<{
    id: string
    roomNumber: string
    name: string
    type: RoomType
    status: RoomStatus
    pricePerNight: number
    nightsSold: number
    occupancyRate: number
    revenue: number
    bookingCount: number
  }>
}

export interface BookingsReportData {
  range: ReportRangeMeta
  kpis: {
    totalBookings: number
    confirmedOrCompleted: number
    cancelledCount: number
    cancellationRate: number
    avgLengthOfStay: number
    totalGuestsHosted: number
  }
  byStatus: Array<{
    status: BookingStatus
    count: number
    revenue: number
    share: number
  }>
  bookings: Array<{
    id: string
    bookingReference: string
    guestName: string
    roomNumber: string
    roomName: string
    checkIn: Date | string
    checkOut: Date | string
    nights: number
    guestsCount: number
    totalAmount: number
    amountPaid: number
    status: BookingStatus
    paymentStatus: PaymentStatus
  }>
}

export interface GuestsReportData {
  range: ReportRangeMeta
  kpis: {
    totalGuests: number
    newGuestsInPeriod: number
    repeatGuestsCount: number
    verifiedIdRate: number
  }
  byIdType: Array<{
    idType: string
    count: number
    share: number
  }>
  byNationality: Array<{
    nationality: string
    count: number
    share: number
  }>
  topGuests: Array<{
    id: string
    name: string
    email: string | null
    phone: string
    nationality: string | null
    bookingCount: number
    totalNights: number
    totalSpent: number
    lastStay: Date | string | null
  }>
}

export type CmsSectionKey =
  | 'hero'
  | 'story'
  | 'rooms'
  | 'amenities'
  | 'gallery'
  | 'contact'

export interface CmsSectionData {
  key: CmsSectionKey
  title: string
  subtitle: string
  body: string
  ctaLabel: string
  ctaHref: string
  images: string[]
  metadata: Record<string, string>
  isPublished: boolean
  sortOrder: number
  updatedAt?: Date | string | null
  updatedByName?: string | null
}

export interface PublicRoomItem {
  id: string
  roomNumber: string
  name: string
  type: RoomType
  description: string | null
  capacity: number
  pricePerNight: number
  amenities: string[]
  images: string[]
  status: RoomStatus
}

export interface PublicBookingLookupResult {
  bookingReference: string
  status: BookingStatus
  paymentStatus: PaymentStatus
  checkIn: Date | string
  checkOut: Date | string
  nights: number
  guestsCount: number
  totalAmount: number
  amountPaid: number
  balanceDue: number
  roomName: string
  roomNumber: string
  guestName: string
}
