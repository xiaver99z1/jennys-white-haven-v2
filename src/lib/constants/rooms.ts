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

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED'

export type PaymentMethod = 'CASH' | 'GCASH' | 'BANK_TRANSFER' | 'CARD'

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

export const BOOKING_STATUSES: readonly {
  label: string
  value: BookingStatus
  colorClass: string
}[] = [
  {
    label: 'Pending',
    value: 'PENDING',
    colorClass: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    label: 'Confirmed',
    value: 'CONFIRMED',
    colorClass: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  {
    label: 'Checked In',
    value: 'CHECKED_IN',
    colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    label: 'Checked Out',
    value: 'CHECKED_OUT',
    colorClass: 'bg-stone-100 text-stone-700 border-stone-200',
  },
  {
    label: 'Cancelled',
    value: 'CANCELLED',
    colorClass: 'bg-rose-100 text-rose-800 border-rose-200',
  },
] as const

export const PAYMENT_STATUSES: readonly {
  label: string
  value: PaymentStatus
  colorClass: string
}[] = [
  {
    label: 'Unpaid',
    value: 'UNPAID',
    colorClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    label: 'Partial',
    value: 'PARTIAL',
    colorClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    label: 'Paid',
    value: 'PAID',
    colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    label: 'Refunded',
    value: 'REFUNDED',
    colorClass: 'bg-stone-100 text-stone-600 border-stone-200',
  },
] as const

export const PAYMENT_METHODS: readonly {
  label: string
  value: PaymentMethod
}[] = [
  { label: 'Cash', value: 'CASH' },
  { label: 'GCash', value: 'GCASH' },
  { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
  { label: 'Credit / Debit Card', value: 'CARD' },
] as const

export const RESORT_AMENITY_PRESETS: readonly string[] = [
  'Queen Bed',
  'King Bed',
  'Fully Air-Conditioned',
  'Free Wi-Fi',
  'Smart TV',
  'Videoke / Karaoke',
  'Living Room Area',
  'Dining Area',
  'Dirty Kitchen / Outdoor Cooking',
  'Laundry Kitchen / Outdoor Cooking',
  'Refrigerator',
  'Hot & Cold Shower',
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

export interface AmenityCategory {
  category: string
  headerBg: string
  borderColor: string
  items: readonly string[]
}

export const RESORT_AMENITY_CATEGORIES: readonly AmenityCategory[] = [
  {
    category: 'Bathroom',
    headerBg: 'bg-teal-700 text-white',
    borderColor: 'border-teal-200',
    items: [
      'Towels (bath, hand, face)',
      'Washcloths',
      'Hand soap',
      'Body wash / soap',
      'Shampoo',
      'Conditioner',
      'Toilet paper',
      'Toilet brush',
      'Hair dryer',
      'Bath mat',
      'Trash can',
      'Cleaning supplies',
    ],
  },
  {
    category: 'Bedroom',
    headerBg: 'bg-rose-700 text-white',
    borderColor: 'border-rose-200',
    items: [
      'Bed with mattress',
      'Pillows',
      'Bed sheets',
      'Blankets / duvet',
      'Extra blankets',
      'Nightstands',
      'Lamps',
      'Hangers',
      'Closet or wardrobe',
      'Iron',
      'Area rug',
      'Ironing board',
      'Extra bed pillows',
    ],
  },
  {
    category: 'Kitchen',
    headerBg: 'bg-sky-700 text-white',
    borderColor: 'border-sky-200',
    items: [
      'Refrigerator',
      'Stove / cooktop',
      'Microwave',
      'Oven',
      'Rice Cooker',
      'Blender',
      'Coffee maker',
      'Electric kettle',
      'Toaster',
      'Pots and pans',
      'Dishes and bowls',
      'Glasses and mugs',
      'Utensils and cutlery',
      'Basic cooking essentials (oil, salt, pepper)',
      'Trash can',
    ],
  },
  {
    category: 'Living Room',
    headerBg: 'bg-indigo-700 text-white',
    borderColor: 'border-indigo-200',
    items: [
      'Wooden Sofa / Wooden Seating',
      'Coffee table',
      'Dining table and Chairs',
      'Ceiling fan',
      'Flat Screen TV',
      'Audio mixer',
      'Area rugs',
      'Speaker cabinets',
      'Karaoke',
      'Extension cords',
      'TV remote',
      'Throw blankets',
      'Books / games',
      'Decor',
      'Extra pillows',
    ],
  },
  {
    category: 'Essentials',
    headerBg: 'bg-amber-700 text-white',
    borderColor: 'border-amber-200',
    items: [
      'Wi-Fi',
      'Air conditioning / heating',
      'First aid kit',
      'Fire extinguisher',
      'Smoke detector',
      'Carbon monoxide detector',
      'Flashlight',
      'Extra batteries',
      'Basic cleaning supplies',
      'Laundry detergent',
      'Trash bags',
      'House rules guide',
    ],
  },
  {
    category: 'Outdoor / Misc.',
    headerBg: 'bg-emerald-700 text-white',
    borderColor: 'border-emerald-200',
    items: [
      'Outdoor seating',
      'Table',
      'Outdoor lighting',
      'BBQ grill (if applicable)',
      'Trash / recycling bins',
      'Welcome guide / manual',
      'Lockbox or smart lock',
      'Parking information',
      'Local recommendations',
      'Umbrella',
      'Shoes off mat',
    ],
  },
] as const
