import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'

export async function getServerSession() {
  const headers = getRequestHeaders()
  return await auth.api.getSession({ headers })
}
