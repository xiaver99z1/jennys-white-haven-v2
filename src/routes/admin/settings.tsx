import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '#/lib/auth'
import { hasPermission } from '#/lib/permissions'
import { getAdminCmsSections } from '#/server/cms-actions'
import { CmsSettings } from '#/components/admin/settings/CmsSettings'

const checkCmsAccess = createServerFn({ method: 'GET' }).handler(async () => {
  const { getRequestHeaders } = await import('@tanstack/react-start/server')
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  return session?.user ?? null
})

export const Route = createFileRoute('/admin/settings')({
  beforeLoad: async () => {
    const user = await checkCmsAccess()
    if (!user) throw redirect({ to: '/admin/login' })
    if (!hasPermission(user, 'manage:cms')) throw redirect({ to: '/admin' })
  },
  loader: async () => await getAdminCmsSections(),
  component: AdminSettingsPage,
})

function AdminSettingsPage() {
  const initialSections = Route.useLoaderData()
  return <CmsSettings initialSections={initialSections} />
}
