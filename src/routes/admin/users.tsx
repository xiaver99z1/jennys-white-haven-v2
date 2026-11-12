import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '#/lib/auth'
import { prisma } from '#/lib/prisma'
import { hasPermission } from '#/lib/permissions'
import { UsersList } from '#/components/admin/users/UsersList'

const checkUserAccess = createServerFn({ method: 'GET' }).handler(async () => {
  const { getRequestHeaders } = await import('@tanstack/react-start/server')
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  return session?.user ?? null
})

const getUsersList = createServerFn({ method: 'GET' }).handler(async () => {
  const { getRequestHeaders } = await import('@tanstack/react-start/server')
  const session = await auth.api.getSession({ headers: getRequestHeaders() })

  if (!session?.user || !hasPermission(session.user, 'view:users')) {
    throw new Error('Unauthorized')
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      role: true,
      banned: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return users
})

export const Route = createFileRoute('/admin/users')({
  beforeLoad: async () => {
    const user = await checkUserAccess()
    if (!user) throw redirect({ to: '/admin/login' })
    if (!hasPermission(user, 'view:users'))
      throw redirect({ to: '/admin' })
  },
  loader: async () => await getUsersList(),
  component: AdminUsersPage,
})

function AdminUsersPage() {
  const initialUsers = Route.useLoaderData()
  const router = useRouter()

  return <UsersList initialUsers={initialUsers} router={router} />
}
