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
  invalidate: () => Promise<unknown>
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
