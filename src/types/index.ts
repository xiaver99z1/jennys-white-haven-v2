import type { ROLES } from '#/lib/permissions'

export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'CLEANING'

export type RoomType = 'Standard' | 'Deluxe' | 'Whole House'

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

export type ResortRole =
  | 'SUPER_ADMIN'
  | 'OWNER'
  | 'MANAGER'
  | 'RECEPTIONIST'
  | 'super_admin'
  | 'owner'
  | 'manager'
  | 'receptionist'

export type StaffRoleValue = Extract<
  ResortRole,
  'RECEPTIONIST' | 'MANAGER' | 'OWNER' | 'SUPER_ADMIN'
>

export interface StaffRoleOption {
  value: StaffRoleValue
  label: string
}

export interface StatusMessage {
  type: 'success' | 'error'
  text: string
}

export interface RequestClientMeta {
  ipAddress: string
  userAgent: string
}

export interface UserDisplayTarget {
  email?: string | null
  name?: string | null
}

export interface EditableStaffUser {
  id: string
  name: string
  role: string | null
}

export interface InitialSetupInput {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface VerifyActivationTokenInput {
  token: string
}

export interface ResendVerificationByEmailInput {
  email: string
}

export interface ResetPasswordWithTokenInput {
  token: string
  newPassword: string
  confirmPassword: string
}

export interface CreateAdminUserInput {
  name: string
  email: string
  role: ResortRole
}

export interface UpdateAdminUserInput {
  userId: string
  name: string
  password?: string
  adminPassword?: string
  role: ResortRole
}

export interface AdminUserIdInput {
  userId: string
}

export interface SendVerificationEmailOptions {
  to: string
  name: string
  rawToken: string
  expiresInMinutes?: number
}

export interface ActionEmailTemplate {
  to: string
  name: string
  subject: string
  heading: string
  bodyHtml: (safeName: string, expiryLabel: string) => string
  ctaLabel: string
  actionUrl: string
  footerNote: string
  textLines: (name: string, expiryLabel: string, actionUrl: string) => string[]
  expiresInMinutes: number
  fallbackErrorMessage: string
}

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
  extraPersonFee?: number | string
  extraChildFee?: number | string
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
  extraPersonFee?: number
  extraChildFee?: number
}

export interface BookingGuestOption {
  id: string
  firstName: string
  lastName: string
  phone: string
  email?: string | null
}

export interface BlockedDateItem {
  id: string
  roomId: string | null
  startDate: Date | string
  endDate: Date | string
  reason: string
  createdAt?: Date | string
  room?: {
    id: string
    roomNumber: string
    name: string
    type: string
  } | null
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
    extraPersonFee?: number
    extraChildFee?: number
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

export interface AnalyticsReportData {
  range: ReportRangeMeta
  kpis: {
    totalViews: number
    uniqueVisitors: number
    topCountryName: string | null
    topCountryShare: number
    mobileShare: number
    avgViewsPerVisitor: number
  }
  dailyTrend: Array<{
    date: string
    views: number
    visitors: number
  }>
  byCountry: Array<{
    countryCode: string
    countryName: string
    views: number
    visitors: number
    share: number
  }>
  byPage: Array<{
    path: string
    views: number
    visitors: number
    share: number
  }>
  byDevice: Array<{
    deviceType: string
    count: number
    share: number
  }>
  byReferrer: Array<{
    referrer: string
    count: number
    share: number
  }>
  integrations: {
    gaConfigured: boolean
    vercelAnalyticsReady: boolean
  }
}

export type CmsSectionKey =
  | 'branding'
  | 'hero'
  | 'story'
  | 'rooms'
  | 'amenities'
  | 'gallery'
  | 'explore'
  | 'contact'

export interface BrandLogosConfig {
  adminIconLogo: string
  adminAuthLogo: string
  publicBrandLogo: string
}

export interface HeroElementPosition {
  x: number
  y: number
}

export interface HeroSlideItem {
  id: string
  image: string
  contentHtml: string
  showText: boolean
  textPosition: HeroElementPosition
  textWidth?: number
  mobileTextPosition?: HeroElementPosition
  mobileTextWidth?: number
  mobileTextScale?: number
  mobileImageFocalX?: number
}

export interface HeroCarouselConfig {
  slides: HeroSlideItem[]
  autoplay: boolean
  intervalMs: number
  showCta: boolean
  ctaPosition: HeroElementPosition
  mobileCtaPosition?: HeroElementPosition
  showBookingBar: boolean
  bookingBarPosition: HeroElementPosition
  mobileBookingBarPosition?: HeroElementPosition
}

export type TouristSpotCategory =
  | 'Beach'
  | 'Cave & Lagoon'
  | 'Lake & Nature'
  | 'Cliff & Viewpoint'
  | 'Heritage & Culture'
  | 'Food & Local Life'

export interface TouristSpotItem {
  id: string
  name: string
  category: TouristSpotCategory
  location: string
  travelTime: string
  bestTime: string
  entranceFee: string
  description: string
  tips: string
  image: string
  images?: string[]
}

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

export interface BookedDateRange {
  checkIn: string
  checkOut: string
}

export interface PublicRoomItem {
  id: string
  roomNumber: string
  name: string
  type: RoomType
  description: string | null
  capacity: number
  pricePerNight: number
  extraPersonFee: number
  extraChildFee: number
  amenities: string[]
  images: string[]
  status: RoomStatus
  bookedRanges?: BookedDateRange[]
}

export interface PublicBookingReviewSummary {
  id: string
  rating: number
  title: string | null
  comment: string
  status: ReviewStatus
  createdAt: Date | string
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
  canSubmitReview?: boolean
  existingReview?: PublicBookingReviewSummary | null
}

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'HIDDEN'

export interface PublicReviewItem {
  id: string
  guestName: string
  guestLocation: string | null
  roomName: string | null
  isVerifiedStay: boolean
  rating: number
  title: string | null
  comment: string
  isFeatured: boolean
  adminReply: string | null
  adminRepliedAt: Date | string | null
  createdAt: Date | string
}

export interface AdminReviewItem extends PublicReviewItem {
  bookingReference: string | null
  status: ReviewStatus
}

export interface PublicReviewsSummary {
  totalCount: number
  averageRating: number
  ratingBreakdown: Array<{
    stars: number
    count: number
    share: number
  }>
  reviews: PublicReviewItem[]
}

export type ChatThreadStatus = 'OPEN' | 'RESOLVED'

export type ChatSenderType = 'VISITOR' | 'STAFF'

export interface ChatMessageItem {
  id: string
  conversationId: string
  senderType: ChatSenderType
  senderName: string
  body: string
  createdAt: Date | string
}

export interface PublicChatConversation {
  id: string
  visitorName: string
  visitorEmail: string | null
  visitorPhone: string | null
  status: ChatThreadStatus
  unreadByVisitor: number
  lastMessageAt: Date | string
  createdAt: Date | string
}

export interface PublicChatStateResponse {
  staffOnline: boolean
  conversation: PublicChatConversation | null
  messages: ChatMessageItem[]
}

export interface AdminChatConversationSummary {
  id: string
  visitorName: string
  visitorEmail: string | null
  visitorPhone: string | null
  status: ChatThreadStatus
  unreadByStaff: number
  lastMessageAt: Date | string
  lastMessagePreview: string
  createdAt: Date | string
  matchedGuestId: string | null
  matchedGuestName: string | null
}

export interface AdminChatInboxResponse {
  conversations: AdminChatConversationSummary[]
  unreadThreadsCount: number
  unreadMessagesCount: number
  chatAvailable: boolean
  onlineStaffCount: number
}

export interface AdminChatThreadDetail {
  conversation: AdminChatConversationSummary
  messages: ChatMessageItem[]
}
