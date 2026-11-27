import { createFileRoute } from '@tanstack/react-router'
import { AdminChatInbox } from '#/components/admin/chat/AdminChatInbox'
import { getAdminChatInbox } from '#/server/chat-actions'

interface AdminChatSearch {
  thread?: string
}

export const Route = createFileRoute('/admin/chat')({
  validateSearch: (search: Record<string, unknown>): AdminChatSearch => ({
    thread:
      typeof search.thread === 'string' && search.thread.trim()
        ? search.thread.trim()
        : undefined,
  }),
  loader: async () => {
    const inbox = await getAdminChatInbox({ data: { status: 'ALL' } })
    return { inbox }
  },
  head: () => ({
    meta: [{ title: "Live Chat Support | Admin | Jenny's White Haven" }],
  }),
  component: AdminChatPage,
})

function AdminChatPage() {
  const { inbox } = Route.useLoaderData()
  const { thread } = Route.useSearch()

  return <AdminChatInbox initialData={inbox} initialSelectedId={thread} />
}
