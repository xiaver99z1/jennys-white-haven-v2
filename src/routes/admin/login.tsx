import { createFileRoute } from '@tanstack/react-router'
import { AdminLoginForm } from '#/components/admin/auth/AdminLoginForm'

export const Route = createFileRoute('/admin/login')({
  head: () => ({
    meta: [{ title: "Login | Jenny's White Haven" }],
    links: [{ rel: 'icon', href: '/logo.png' }],
  }),
  component: AdminLoginPage,
})

function AdminLoginPage() {
  return <AdminLoginForm />
}
