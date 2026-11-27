import type { Permission, Role } from '#/types'

const FULL_PERMISSIONS = [
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
  'view:reports',
  'manage:cms',
  'manage:chat',
] as const

export const ROLES = {
  super_admin: FULL_PERMISSIONS,
  owner: FULL_PERMISSIONS,
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
    'view:reports',
    'manage:cms',
    'manage:chat',
  ],
  receptionist: [
    'view:rooms',
    'view:bookings',
    'create:bookings',
    'view:guests',
    'create:guests',
    'manage:chat',
  ],
} as const

export type { Permission, Role }

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
