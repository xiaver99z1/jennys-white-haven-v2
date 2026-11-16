import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '#/lib/auth'
import { hasPermission } from '#/lib/permissions'
import { getAdminCmsSections } from '#/server/cms-actions'
import { CmsSettings } from '#/components/admin/settings/CmsSettings'
import { getErrorMessage } from '#/lib/formatters'

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
  pendingComponent: () => (
    <div className="p-8 text-center text-sm text-stone-500">
      Loading website settings...
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="max-w-lg mx-auto my-12 bg-white rounded-2xl border border-rose-200 p-6 space-y-3 text-center">
      <h2 className="text-base font-bold text-stone-900">
        Unable to load Website Settings
      </h2>
      <p className="text-xs text-rose-600">
        {getErrorMessage(error, 'Failed to load website settings.')}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold cursor-pointer"
      >
        Retry
      </button>
    </div>
  ),
  component: AdminSettingsPage,
})

function AdminSettingsPage() {
  const initialSections = Route.useLoaderData()
  return <CmsSettings initialSections={initialSections} />
}
