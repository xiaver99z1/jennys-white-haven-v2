import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin } from 'better-auth/plugins'
import { createAccessControl } from 'better-auth/plugins/access'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { prisma } from './prisma'

// Define inline access control statements for user management
const ac = createAccessControl({
  user: ['create', 'list', 'set-role', 'ban'],
})

const ownerRole = ac.newRole({
  user: ['create', 'list', 'set-role', 'ban'],
})

const managerRole = ac.newRole({
  user: ['list'],
})

const receptionistRole = ac.newRole({})

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  trustedOrigins: [
    process.env.BETTER_AUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ].filter(Boolean) as string[],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true, // Prevents unverified users from logging in
  },

  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'receptionist',
        input: false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  plugins: [
    admin({
      defaultRole: 'receptionist',
      roles: {
        owner: ownerRole,
        manager: managerRole,
        receptionist: receptionistRole,
      },
    }),
    tanstackStartCookies(), // Must be the absolute last plugin
  ],
})
