import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '#/lib/auth'
import { hasPermission } from '#/lib/permissions'
import { getErrorMessage } from '#/lib/formatters'
import { getAdminReviews } from '#/server/review-actions'
import { ReviewsManager } from '#/components/admin/reviews/ReviewsManager'

const checkReviewsAccess = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getRequestHeaders } = await import('@tanstack/react-start/server')
    const session = await auth.api.getSession({ headers: getRequestHeaders() })
    return session?.user ?? null
  },
)

function AdminReviewsError({
  error,
  reset,
}: {
  error: unknown
  reset: () => void
}) {
  const router = useRouter()

  return (
    <div className="max-w-lg mx-auto my-12 bg-white rounded-2xl border border-rose-200 p-6 space-y-3 text-center">
      <h2 className="text-base font-bold text-stone-900">
        Unable to load Guest Reviews
      </h2>
      <p className="text-xs text-rose-600">
        {getErrorMessage(error, 'Failed to load guest reviews.')}
      </p>
      <button
        type="button"
        onClick={() => {
          void router.invalidate().finally(() => reset())
        }}
        className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold cursor-pointer"
      >
        Retry
      </button>
    </div>
  )
}

export const Route = createFileRoute('/admin/reviews')({
  beforeLoad: async () => {
    const user = await checkReviewsAccess()
    if (!user) throw redirect({ to: '/admin/login' })
    if (!hasPermission(user, 'manage:cms')) throw redirect({ to: '/admin' })
  },
  loader: async () => await getAdminReviews(),
  head: () => ({
    meta: [{ title: "Guest Reviews | Jenny's White Haven" }],
  }),
  pendingComponent: () => (
    <div className="p-8 text-center text-sm text-stone-500">
      Loading guest reviews...
    </div>
  ),
  errorComponent: AdminReviewsError,
  component: AdminReviewsPage,
})

function AdminReviewsPage() {
  const initialReviews = Route.useLoaderData()
  return <ReviewsManager initialReviews={initialReviews} />
}
