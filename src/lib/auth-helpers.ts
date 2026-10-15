import { getRequestHeaders } from '@tanstack/react-start/server' // or 'vinxi/http'
import { auth } from '#/lib/auth'

/**
 * Ensures the request is authenticated and returns the entire session object if you need user details (email, role, IP, userAgent)
 */
export async function authSession(
  errorMessage = 'Unauthorized: Authentication required.',
) {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })

  if (!session || !session.user) {
    throw new Error(errorMessage)
  }

  return session
}
