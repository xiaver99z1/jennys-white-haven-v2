import { createFileRoute } from '@tanstack/react-router'
import { AdminSetupForm } from '#/components/admin/auth/AdminSetupForm'

export const Route = createFileRoute('/admin/setup')({
  head: () => ({
    meta: [{ title: "Initial Setup | Jenny's White Haven" }],
    links: [{ rel: 'icon', href: '/logo.png' }],
  }),
  component: AdminSetupPage,
})

function AdminSetupPage() {
  return <AdminSetupForm />
}
