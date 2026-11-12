import { createServerOnlyFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'

/**
 * Safely retrieves request headers on the server only
 */
export const getServerHeaders = createServerOnlyFn(() => {
  return getRequestHeaders()
})

/**
 * Ensures the request is authenticated and returns the entire session object
 * if you need user details (email, role, IP, userAgent)
 */
export const authSession = createServerOnlyFn(
  async (errorMessage = 'Unauthorized: Authentication required.') => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })

    if (!session) {
      throw new Error(errorMessage)
    }

    return session
  },
)
