import crypto from 'crypto'

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
  const passwordChars = [
    uppercase[crypto.randomInt(uppercase.length)],
    lowercase[crypto.randomInt(lowercase.length)],
    numbers[crypto.randomInt(numbers.length)],
    specials[crypto.randomInt(specials.length)],
  ]

  // Fill the remaining length with random characters from the full pool
  for (let i = passwordChars.length; i < length; i++) {
    passwordChars.push(allChars[crypto.randomInt(allChars.length)])
  }

  // Shuffle the array securely so required characters aren't always at the start
  return passwordChars.sort(() => crypto.randomInt(-1, 2)).join('')
}
