// ==========================================
// 1. DOMAIN TYPES
// ==========================================

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

// ==========================================
// 2. CONSTANTS & PRESETS
// ==========================================

export const ROOM_TYPES: readonly RoomType[] = [
  'Standard',
  'Deluxe',
  'Suite',
  'Villa',
] as const

export const ROOM_STATUSES: readonly {
  label: string
  value: RoomStatus
  colorClass: string
}[] = [
  {
    label: 'Available',
    value: 'AVAILABLE',
    colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    label: 'Occupied',
    value: 'OCCUPIED',
    colorClass: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    label: 'Maintenance',
    value: 'MAINTENANCE',
    colorClass: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  {
    label: 'Cleaning',
    value: 'CLEANING',
    colorClass: 'bg-sky-100 text-sky-800 border-sky-200',
  },
] as const

export const GUEST_ID_TYPES: readonly GuestIdType[] = [
  'National ID',
  "Driver's License",
  'Passport',
  'SSS / GSIS ID',
  'Postal ID',
  'Voter ID',
  'Other',
] as const

export const DEFAULT_NATIONALITY = 'Filipino'

// Common resort/villa amenities for quick-selection in modals
export const RESORT_AMENITY_PRESETS: readonly string[] = [
  'Queen Bed',
  'King Bed',
  'Fully Air-Conditioned',
  'Free Wi-Fi',
  'Smart TV',
  'Videoke / Karaoke',
  'Living Room Area',
  'Dining Area',
  'Complete Kitchen',
  'Dirty Kitchen / Outdoor Cooking',
  'Rooftop Lounge',
  'Garden',
  'Refrigerator',
  'Hot & Cold Shower',
  'Private Pool Access',
  'Balcony / Terrace',
] as const

// Default values for form initializations
export const INITIAL_ROOM_FORM_STATE = {
  roomNumber: '',
  name: '',
  type: 'Standard' as RoomType,
  description: '',
  capacity: 2,
  pricePerNight: 3500,
  status: 'AVAILABLE' as RoomStatus,
  amenityInput: '',
  amenities: ['Wi-Fi', 'Air Conditioning', 'Hot Shower'] as string[],
}
