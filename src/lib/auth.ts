import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { prisma } from './prisma'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // Optional: Explicitly trust your production domain if needed alongside BETTER_AUTH_URL
  trustedOrigins: [
    process.env.BETTER_AUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ].filter(Boolean) as string[],

  emailAndPassword: {
    enabled: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },

  // Important for TanStack Start
  plugins: [
    tanstackStartCookies(), // ← must be the last plugin
  ],
})
