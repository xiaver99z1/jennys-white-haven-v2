import type {
  RequestClientMeta,
  StaffRoleOption,
  UserDisplayTarget,
} from '#/types'

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const DEFAULT_SMTP_HOST = 'smtp.gmail.com'
export const DEFAULT_SMTP_PORT = 465
export const DEFAULT_FROM_NAME = "Jenny's White Haven"
export const DEFAULT_FROM_EMAIL = "Jenny's White Haven <noreply@jennyswhitehaven.com>"
export const DEFAULT_APP_BASE_URL = 'http://localhost:3000'
export const DEFAULT_CLIENT_IP = '127.0.0.1'
export const DEFAULT_USER_AGENT = 'Unknown User-Agent'
export const DEFAULT_TEMP_STAFF_PASSWORD = 'Password!123'

export const VERIFICATION_EXPIRES_MINUTES = 60
export const VERIFICATION_TOKEN_TTL_MS =
  VERIFICATION_EXPIRES_MINUTES * 60 * 1000 // 1 hour
export const STAFF_INVITE_EXPIRES_MINUTES = 3 * 24 * 60 // 4320 minutes (3 days)
export const STAFF_INVITE_TOKEN_TTL_MS =
  STAFF_INVITE_EXPIRES_MINUTES * 60 * 1000 // 3 days

export const PASSWORD_RESET_EXPIRES_MINUTES = 30
export const PASSWORD_RESET_TTL_MS =
  PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000 // 30 minutes
export const PASSWORD_RESET_PREFIX = 'password-reset:'
export const PASSWORD_RESET_QUOTA_PREFIX = 'password-reset-quota:'

export const AUTH_EMAIL_COOLDOWN_MINUTES = 5
export const AUTH_EMAIL_COOLDOWN_SECONDS =
  AUTH_EMAIL_COOLDOWN_MINUTES * 60 // 300 seconds (5 minutes)
export const AUTH_EMAIL_COOLDOWN_MS =
  AUTH_EMAIL_COOLDOWN_SECONDS * 1000 // 5 minutes

export const RESEND_COOLDOWN_MINUTES = AUTH_EMAIL_COOLDOWN_MINUTES
export const RESEND_COOLDOWN_SECONDS = AUTH_EMAIL_COOLDOWN_SECONDS
export const RESEND_COOLDOWN_MS = AUTH_EMAIL_COOLDOWN_MS

export const PASSWORD_RESET_COOLDOWN_MINUTES = AUTH_EMAIL_COOLDOWN_MINUTES
export const PASSWORD_RESET_COOLDOWN_SECONDS = AUTH_EMAIL_COOLDOWN_SECONDS
export const PASSWORD_RESET_COOLDOWN_MS = AUTH_EMAIL_COOLDOWN_MS

export const DAY_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours
export const MAX_AUTH_EMAILS_PER_DAY = 3
export const MAX_VERIFICATION_EMAILS_PER_DAY = MAX_AUTH_EMAILS_PER_DAY
export const MAX_PASSWORD_RESET_EMAILS_PER_DAY = MAX_AUTH_EMAILS_PER_DAY

export const ADMIN_REAUTH_PREFIX = 'admin-reauth-fail:'
export const MAX_ADMIN_REAUTH_ATTEMPTS = 5
export const ADMIN_REAUTH_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export const FULL_NAME_MIN_LENGTH = 2
export const FULL_NAME_MAX_LENGTH = 100

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128
export const STAFF_PASSWORD_MAX_LENGTH = 16

export const GENERIC_RESEND_MESSAGE =
  'If an unverified account exists for this email, a fresh verification link has been sent.'

export const STAFF_ROLE_OPTIONS: readonly StaffRoleOption[] = [
  { value: 'RECEPTIONIST', label: 'Receptionist' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'OWNER', label: 'Owner' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
] as const

/**
 * Validates standard strong password requirements (8-128 chars, upper, lower, number, special).
 */
export function validateStrongPassword(password: string): string | null {
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters long.`
  }

  if (
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    return 'Password must include uppercase, lowercase, a number, and a special character.'
  }

  return null
}

/**
 * Validates staff profile password requirements (8-16 chars with granular requirement messages).
 */
export function validateStaffPassword(password: string): string | null {
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > STAFF_PASSWORD_MAX_LENGTH
  ) {
    return `Password must be between ${PASSWORD_MIN_LENGTH} and ${STAFF_PASSWORD_MAX_LENGTH} characters long.`
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.'
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.'
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.'
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must contain at least one special character.'
  }
  return null
}

/**
 * Extracts client IP address and User-Agent from request headers with safe fallbacks.
 */
export function extractRequestClientMeta(headers: {
  get: (name: string) => string | null
}): RequestClientMeta {
  return {
    ipAddress:
      headers.get('x-forwarded-for') ||
      headers.get('x-real-ip') ||
      DEFAULT_CLIENT_IP,
    userAgent: headers.get('user-agent') || DEFAULT_USER_AGENT,
  }
}

/**
 * Resolves a human-readable identifier (email -> name -> fallback) for audit logs.
 */
export function resolveUserDisplayIdentifier(
  user: UserDisplayTarget | null | undefined,
  fallback: string,
): string {
  return user?.email || user?.name || fallback
}

/**
 * Formats remaining cooldown seconds as "Xm YYs" (or "Ys" when < 60s).
 */
export function formatCooldownDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}
