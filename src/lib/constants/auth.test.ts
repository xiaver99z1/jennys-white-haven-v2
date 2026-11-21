import { describe, it, expect } from 'vitest'
import {
  ADMIN_REAUTH_PREFIX,
  ADMIN_REAUTH_WINDOW_MS,
  DAY_WINDOW_MS,
  DEFAULT_CLIENT_IP,
  DEFAULT_FROM_NAME,
  DEFAULT_SMTP_HOST,
  DEFAULT_SMTP_PORT,
  DEFAULT_USER_AGENT,
  EMAIL_REGEX,
  MAX_ADMIN_REAUTH_ATTEMPTS,
  MAX_PASSWORD_RESET_EMAILS_PER_DAY,
  MAX_VERIFICATION_EMAILS_PER_DAY,
  PASSWORD_RESET_COOLDOWN_MINUTES,
  PASSWORD_RESET_COOLDOWN_MS,
  PASSWORD_RESET_COOLDOWN_SECONDS,
  PASSWORD_RESET_PREFIX,
  PASSWORD_RESET_QUOTA_PREFIX,
  PASSWORD_RESET_TTL_MS,
  RESEND_COOLDOWN_MINUTES,
  RESEND_COOLDOWN_MS,
  RESEND_COOLDOWN_SECONDS,
  STAFF_INVITE_EXPIRES_MINUTES,
  STAFF_ROLE_OPTIONS,
  VERIFICATION_TOKEN_TTL_MS,
  extractRequestClientMeta,
  formatCooldownDuration,
  resolveUserDisplayIdentifier,
  validateStaffPassword,
  validateStrongPassword,
} from './auth'

describe('auth constants and helpers', () => {
  it('exports expected security thresholds, TTLs, and staff role options', () => {
    expect(EMAIL_REGEX.test('admin@resort.com')).toBe(true)
    expect(EMAIL_REGEX.test('invalid')).toBe(false)
    expect(DEFAULT_SMTP_HOST).toBe('smtp.gmail.com')
    expect(DEFAULT_SMTP_PORT).toBe(465)
    expect(DEFAULT_FROM_NAME).toBe("Jenny's White Haven")
    expect(STAFF_INVITE_EXPIRES_MINUTES).toBe(4320)
    expect(VERIFICATION_TOKEN_TTL_MS).toBe(3_600_000)
    expect(PASSWORD_RESET_TTL_MS).toBe(1_800_000)
    expect(PASSWORD_RESET_COOLDOWN_MINUTES).toBe(5)
    expect(PASSWORD_RESET_COOLDOWN_SECONDS).toBe(300)
    expect(PASSWORD_RESET_COOLDOWN_MS).toBe(300_000)
    expect(RESEND_COOLDOWN_MINUTES).toBe(5)
    expect(RESEND_COOLDOWN_SECONDS).toBe(300)
    expect(RESEND_COOLDOWN_MS).toBe(300_000)
    expect(DAY_WINDOW_MS).toBe(86_400_000)
    expect(MAX_VERIFICATION_EMAILS_PER_DAY).toBe(3)
    expect(MAX_PASSWORD_RESET_EMAILS_PER_DAY).toBe(3)
    expect(MAX_ADMIN_REAUTH_ATTEMPTS).toBe(5)
    expect(ADMIN_REAUTH_WINDOW_MS).toBe(900_000)
    expect(PASSWORD_RESET_PREFIX).toBe('password-reset:')
    expect(PASSWORD_RESET_QUOTA_PREFIX).toBe('password-reset-quota:')
    expect(ADMIN_REAUTH_PREFIX).toBe('admin-reauth-fail:')
    expect(STAFF_ROLE_OPTIONS.map((r) => r.value)).toEqual([
      'RECEPTIONIST',
      'MANAGER',
      'OWNER',
      'SUPER_ADMIN',
    ])
  })

  it('validates strong passwords across length and character class rules', () => {
    expect(validateStrongPassword('Aa1!')).toBe(
      'Password must be between 8 and 128 characters long.',
    )
    expect(validateStrongPassword(`Aa1!${'x'.repeat(125)}`)).toBe(
      'Password must be between 8 and 128 characters long.',
    )
    expect(validateStrongPassword('lowercase!123')).toBe(
      'Password must include uppercase, lowercase, a number, and a special character.',
    )
    expect(validateStrongPassword('UPPERCASE!123')).toBe(
      'Password must include uppercase, lowercase, a number, and a special character.',
    )
    expect(validateStrongPassword('NoNumbers!abc')).toBe(
      'Password must include uppercase, lowercase, a number, and a special character.',
    )
    expect(validateStrongPassword('NoSpecial1234')).toBe(
      'Password must include uppercase, lowercase, a number, and a special character.',
    )
    expect(validateStrongPassword('StrongPassword!123')).toBeNull()
  })

  it('validates staff passwords with granular feedback', () => {
    expect(validateStaffPassword('Short1!')).toBe(
      'Password must be between 8 and 16 characters long.',
    )
    expect(validateStaffPassword('WayTooLongPassword123!')).toBe(
      'Password must be between 8 and 16 characters long.',
    )
    expect(validateStaffPassword('lowercase1!')).toBe(
      'Password must contain at least one uppercase letter.',
    )
    expect(validateStaffPassword('UPPERCASE1!')).toBe(
      'Password must contain at least one lowercase letter.',
    )
    expect(validateStaffPassword('NoNumbers!')).toBe(
      'Password must contain at least one number.',
    )
    expect(validateStaffPassword('NoSpecial1')).toBe(
      'Password must contain at least one special character.',
    )
    expect(validateStaffPassword('ValidPass1!')).toBeNull()
  })

  it('extracts client IP and userAgent with fallbacks', () => {
    expect(
      extractRequestClientMeta({
        get: (k) =>
          k === 'x-forwarded-for' ? '1.2.3.4' : k === 'user-agent' ? 'UA' : null,
      }),
    ).toEqual({ ipAddress: '1.2.3.4', userAgent: 'UA' })

    expect(
      extractRequestClientMeta({
        get: (k) => (k === 'x-real-ip' ? '10.0.0.2' : null),
      }),
    ).toEqual({ ipAddress: '10.0.0.2', userAgent: DEFAULT_USER_AGENT })

    expect(extractRequestClientMeta({ get: () => null })).toEqual({
      ipAddress: DEFAULT_CLIENT_IP,
      userAgent: DEFAULT_USER_AGENT,
    })
  })

  it('resolves user display identifier with email -> name -> fallback precedence', () => {
    expect(
      resolveUserDisplayIdentifier(
        { email: 'admin@resort.com', name: 'Admin' },
        'Fallback',
      ),
    ).toBe('admin@resort.com')
    expect(
      resolveUserDisplayIdentifier({ email: '', name: 'AdminName' }, 'Fallback'),
    ).toBe('AdminName')
    expect(resolveUserDisplayIdentifier({ email: '', name: '' }, 'Admin')).toBe(
      'Admin',
    )
    expect(resolveUserDisplayIdentifier(null, 'user')).toBe('user')
    expect(formatCooldownDuration(45)).toBe('45s')
    expect(formatCooldownDuration(1200)).toBe('20m 00s')
    expect(formatCooldownDuration(125)).toBe('2m 05s')
  })
})
