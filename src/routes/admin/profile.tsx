import { createFileRoute } from '@tanstack/react-router'
import { ProfileSettings } from '#/components/admin/profile/ProfileSettings'

export const Route = createFileRoute('/admin/profile')({
  component: AdminProfilePage,
})

function AdminProfilePage() {
  return <ProfileSettings />
}
