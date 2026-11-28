export const VISITOR_CHAT_TOKEN_KEY = 'jwh_chat_visitor_token'

export const STAFF_ONLINE_WINDOW_MS = 2 * 60 * 1000
export const EMAIL_ALERT_IDLE_COOLDOWN_MS = 30 * 60 * 1000
export const VISITOR_OFFLINE_EMAIL_THRESHOLD_MS = 2 * 60 * 1000

export const PUBLIC_MESSAGE_PAGE_SIZE = 150
export const ADMIN_MESSAGE_PAGE_SIZE = 250

export const VISITOR_TOKEN_REGEX = /^[a-f0-9]{64}$/
export const MAX_VISITOR_MESSAGES_PER_MINUTE = 12
export const MAX_NEW_THREADS_PER_IP_PER_MINUTE = 5

export const CHAT_OPEN_POLL_INTERVAL_MS = 3500
export const CHAT_BACKGROUND_POLL_INTERVAL_MS = 25000
export const ADMIN_PRESENCE_HEARTBEAT_MS = 25000

export const CHAT_ALERT_RECIPIENT_ROLES: ReadonlySet<string> = new Set([
  'super_admin',
  'owner',
  'manager',
])

export const VISITOR_QUICK_TOPICS = [
  'Is our preferred date available?',
  'Whole House rate & capacity',
  'Port pickup from Consuelo / Poro',
  'Check-in & check-out times',
] as const

export const STAFF_QUICK_REPLIES = [
  'Hello! Welcome to Jenny’s White Haven. How can we assist with your stay?',
  'Standard check-in is at 2:00 PM and check-out is at 12:00 PM.',
  'You can check live dates and rates anytime on our Rooms page.',
  'Yes, we can help arrange port pickup from Consuelo or Poro port!',
] as const
