import { authSession } from '#/lib/auth-helpers'
import { hasPermission } from '#/lib/permissions'
import type { Permission } from '#/types'

/**
 * Ensures the active request has an authenticated session with the given RBAC permission.
 */
export async function requirePermission(permission: Permission) {
  const session = await authSession()

  if (!hasPermission(session.user, permission)) {
    throw new Error('Unauthorized: Insufficient permissions.')
  }

  return session.user
}
