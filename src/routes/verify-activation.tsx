import { createFileRoute } from '@tanstack/react-router'
import { VerifyActivationView } from '#/components/admin/auth/VerifyActivationView'

export const Route = createFileRoute('/verify-activation')({
  head: () => ({
    meta: [
      {
        title: "Account Activation | Jenny's White Haven Resort",
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
  component: VerifyActivationPage,
})

function VerifyActivationPage() {
  const { token } = Route.useSearch()
  return <VerifyActivationView initialToken={token} />
}
