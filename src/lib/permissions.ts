export const ROLES = {
  owner: [
    'view:rooms',
    'create:rooms',
    'update:rooms',
    'delete:rooms',
    'view:bookings',
    'create:bookings',
    'update:bookings',
    'delete:bookings',
    'view:guests',
    'create:guests',
    'update:guests',
    'delete:guests',
    'view:users',
    'create:users',
    'update:users',
    'delete:users',
    'resend-email:users',
    'block-user:users',
  ],
  manager: [
    'view:rooms',
    'create:rooms',
    'update:rooms',
    'view:bookings',
    'create:bookings',
    'update:bookings',
    'view:guests',
    'create:guests',
    'update:guests',
    'view:users',
  ],
  receptionist: [
    'view:rooms',
    'view:bookings',
    'create:bookings',
    'view:guests',
    'create:guests',
  ],
} as const

export type Role = keyof typeof ROLES
export type Permission = (typeof ROLES)[Role][number]

export function hasPermission(
  user: { role?: string | null } | null | undefined,
  permission: Permission,
): boolean {
  if (!user || !user.role) return false

  // Convert role to lowercase so "OWNER" and "owner" both resolve correctly
  const userRole = user.role.toLowerCase() as Role
  const permissions = ROLES[userRole] as readonly Permission[] | undefined

  if (!permissions) return false
  return permissions.includes(permission)
}
