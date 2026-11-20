import { createFileRoute } from '@tanstack/react-router'
import { ResetPasswordView } from '#/components/admin/auth/ResetPasswordView'

export const Route = createFileRoute('/reset-password')({
  head: () => ({
    meta: [
      {
        title: "Reset Password | Jenny's White Haven Resort",
      },
      {
        name: 'referrer',
        content: 'no-referrer',
      },
    ],
    links: [
      {
        rel: 'icon',
        href: '/logo.png',
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()
  return <ResetPasswordView initialToken={token} />
}
