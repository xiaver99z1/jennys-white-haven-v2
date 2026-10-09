import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { prisma } from './prisma'

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql', // change to "sqlite" if needed
  }),

  emailAndPassword: {
    enabled: true,
    // requireEmailVerification: false, // keep false for now while testing admin
  },

  // Important for TanStack Start
  plugins: [
    tanstackStartCookies(), // ← must be the last plugin
  ],

  // Optional but recommended
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
})
