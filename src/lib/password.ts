import crypto from 'node:crypto'
/**
 * Generates a secure random temporary password meeting complexity requirements:
 * - Minimum 12, Maximum 16 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function generateSecurePassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const specials = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  const allChars = uppercase + lowercase + numbers + specials

  // Random length between 12 and 16
  const length = crypto.randomInt(12, 17)

  // Guarantee at least one of each required category
  const passwordChars: string[] = [
    uppercase[crypto.randomInt(0, uppercase.length)],
    lowercase[crypto.randomInt(0, lowercase.length)],
    numbers[crypto.randomInt(0, numbers.length)],
    specials[crypto.randomInt(0, specials.length)],
  ]

  // Fill remaining slots
  for (let i = passwordChars.length; i < length; i++) {
    passwordChars.push(allChars[crypto.randomInt(0, allChars.length)])
  }

  // Proper Fisher-Yates shuffle (Guarantees no lost characters or truncated lengths)
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1)
    ;[passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]]
  }

  return passwordChars.join('')
}
