import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import {
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  RotateCcw,
  Search,
  Send,
  UserCheck,
} from 'lucide-react'
import { EmptyState } from '#/components/common/EmptyState'
import { formatShortDate, getErrorMessage } from '#/lib/formatters'
import {
  getAdminChatInbox,
  getAdminChatThread,
  heartbeatAdminPresence,
  sendAdminChatReply,
  updateAdminChatStatus,
} from '#/server/chat-actions'
import type {
  AdminChatConversationSummary,
  AdminChatInboxResponse,
  ChatMessageItem,
  ChatThreadStatus,
} from '#/types'

const STAFF_QUICK_REPLIES = [
  'Hello! Welcome to Jenny’s White Haven. How can we assist with your stay?',
  'Standard check-in is at 2:00 PM and check-out is at 12:00 PM.',
  'You can check live dates and rates anytime on our Rooms page.',
  'Yes, we can help arrange port pickup from Consuelo or Poro port!',
] as const

function formatMessageTimestamp(value: Date | string): string {
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return ''
  return `${formatShortDate(dt)} · ${dt.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

interface AdminChatInboxProps {
  initialData: AdminChatInboxResponse
  initialSelectedId?: string
}

export function AdminChatInbox({
  initialData,
  initialSelectedId,
}: AdminChatInboxProps) {
  const [conversations, setConversations] = useState<
    AdminChatConversationSummary[]
  >(initialData.conversations)
  const [chatAvailable, setChatAvailable] = useState(initialData.chatAvailable)
  const [onlineStaffCount, setOnlineStaffCount] = useState(
    initialData.onlineStaffCount,
  )
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'RESOLVED' | 'ALL'>(
    'OPEN',
  )
  const [searchQuery, setSearchQuery] = useState('')

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (
      initialSelectedId &&
      initialData.conversations.some((c) => c.id === initialSelectedId)
    ) {
      return initialSelectedId
    }
    const firstOpen = initialData.conversations.find((c) => c.status === 'OPEN')
    return firstOpen?.id ?? initialData.conversations.at(0)?.id ?? null
  })

  const [activeConversation, setActiveConversation] =
    useState<AdminChatConversationSummary | null>(
      () =>
        initialData.conversations.find((c) => c.id === selectedId) ?? null,
    )
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [togglingAvailability, setTogglingAvailability] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesListRef = useRef<HTMLDivElement>(null)
  const isMountedRef = useRef(true)

  const notifyBadgeRefresh = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('admin-chat-refresh'))
    }
  }, [])

  const loadInbox = useCallback(async () => {
    try {
      const res = await getAdminChatInbox({ data: { status: 'ALL' } })
      if (!isMountedRef.current) return
      setConversations(res.conversations)
      setChatAvailable(res.chatAvailable)
      setOnlineStaffCount(res.onlineStaffCount)
    } catch {
      // Keep existing list on transient error
    }
  }, [])

  const loadThread = useCallback(
    async (conversationId: string, silent = false) => {
      if (!silent) setLoadingThread(true)
      try {
        const res = await getAdminChatThread({ data: { conversationId } })
        if (!isMountedRef.current) return
        setActiveConversation(res.conversation)
        setMessages(res.messages)
        setConversations((prev) =>
          prev.map((item) =>
            item.id === res.conversation.id
              ? { ...item, unreadByStaff: 0, status: res.conversation.status }
              : item,
          ),
        )
        notifyBadgeRefresh()
      } catch (err) {
        if (!silent && isMountedRef.current) {
          setError(getErrorMessage(err, 'Failed to load conversation.'))
        }
      } finally {
        if (!silent && isMountedRef.current) {
          setLoadingThread(false)
        }
      }
    },
    [notifyBadgeRefresh],
  )

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setActiveConversation(null)
      setMessages([])
      return
    }
    void loadThread(selectedId)
  }, [selectedId, loadThread])

  // Adaptive polling for new messages while viewing /admin/chat
  useEffect(() => {
    if (import.meta.env.MODE === 'test') return

    const timer = setInterval(() => {
      if (document.visibilityState === 'hidden') return
      void loadInbox()
      if (selectedId) {
        void loadThread(selectedId, true)
      }
    }, 3500)

    return () => clearInterval(timer)
  }, [selectedId, loadInbox, loadThread])

  useEffect(() => {
    const container = messagesListRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages.length])

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return conversations.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false
      if (!q) return true
      return (
        c.visitorName.toLowerCase().includes(q) ||
        (c.visitorEmail?.toLowerCase().includes(q) ?? false) ||
        (c.visitorPhone?.toLowerCase().includes(q) ?? false) ||
        c.lastMessagePreview.toLowerCase().includes(q)
      )
    })
  }, [conversations, statusFilter, searchQuery])

  const openCount = useMemo(
    () => conversations.filter((c) => c.status === 'OPEN').length,
    [conversations],
  )
  const resolvedCount = useMemo(
    () => conversations.filter((c) => c.status === 'RESOLVED').length,
    [conversations],
  )

  async function handleToggleAvailability() {
    setTogglingAvailability(true)
    setError(null)
    try {
      const next = !chatAvailable
      const res = await heartbeatAdminPresence({ data: { setAvailable: next } })
      setChatAvailable(res.chatAvailable)
      await loadInbox()
      notifyBadgeRefresh()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update availability status.'))
    } finally {
      setTogglingAvailability(false)
    }
  }

  async function handleSendReply(e: FormEvent) {
    e.preventDefault()
    if (!selectedId || !replyBody.trim() || sendingReply) return
    setSendingReply(true)
    setError(null)
    try {
      const sent = await sendAdminChatReply({
        data: {
          conversationId: selectedId,
          body: replyBody,
        },
      })
      setMessages((prev) =>
        prev.some((m) => m.id === sent.id) ? prev : [...prev, sent],
      )
      setReplyBody('')
      setActiveConversation((prev) =>
        prev ? { ...prev, status: 'OPEN', lastMessagePreview: sent.body } : prev,
      )
      await loadInbox()
      notifyBadgeRefresh()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send reply.'))
    } finally {
      setSendingReply(false)
    }
  }

  async function handleStatusToggle(nextStatus: ChatThreadStatus) {
    if (!selectedId || updatingStatus) return
    setUpdatingStatus(true)
    setError(null)
    try {
      await updateAdminChatStatus({
        data: { conversationId: selectedId, status: nextStatus },
      })
      setActiveConversation((prev) =>
        prev ? { ...prev, status: nextStatus, unreadByStaff: 0 } : prev,
      )
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, status: nextStatus, unreadByStaff: 0 }
            : c,
        ),
      )
      notifyBadgeRefresh()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update conversation status.'))
    } finally {
      setUpdatingStatus(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header & Online Presence Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Live Chat Support
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Respond to website visitors in real time and manage offline guest
            inquiries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs text-stone-500">
            Active staff online: <strong>{onlineStaffCount}</strong>
          </span>
          <button
            type="button"
            disabled={togglingAvailability}
            onClick={() => void handleToggleAvailability()}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
              chatAvailable
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
                : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                chatAvailable ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            {chatAvailable
              ? 'Status: Online for Live Chat'
              : 'Status: Away (Message Mode)'}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700"
        >
          {error}
        </div>
      )}

      {/* 2-Pane Shopify-Style Inbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-[34rem]">
        {/* Left Pane: Thread List */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-stone-100 space-y-3">
            {/* Status Filter Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-stone-100 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter('OPEN')}
                className={`py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'OPEN'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Open ({openCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('RESOLVED')}
                className={`py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'RESOLVED'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Resolved ({resolvedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`py-1.5 rounded-lg transition cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All ({conversations.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guest, email, phone..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-stone-100 max-h-[30rem]">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                No conversations match the current filter.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedId
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSelectedId(conv.id)}
                    className={`w-full text-left p-3.5 transition flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50/70'
                        : conv.unreadByStaff > 0
                          ? 'bg-stone-50 hover:bg-stone-100/70'
                          : 'hover:bg-stone-50'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-stone-900 text-[#FAF8F4] font-bold text-xs flex items-center justify-center shrink-0">
                      {conv.visitorName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-stone-900 truncate">
                          {conv.visitorName}
                        </span>
                        <span className="text-[10px] text-stone-400 shrink-0">
                          {formatShortDate(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 truncate">
                        {conv.lastMessagePreview || 'Started a conversation'}
                      </p>
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            conv.status === 'OPEN'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-stone-100 text-stone-600 border-stone-200'
                          }`}
                        >
                          {conv.status === 'OPEN' ? 'Open' : 'Resolved'}
                        </span>
                        {conv.unreadByStaff > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-700 text-white text-[10px] font-bold">
                            {conv.unreadByStaff} new
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Conversation */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-stone-200 shadow-xs flex flex-col overflow-hidden">
          {!activeConversation ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <EmptyState message="Select a guest inquiry on the left to read and reply." />
            </div>
          ) : (
            <>
              {/* Guest Context Top Bar */}
              <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-stone-50/50">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-stone-900">
                      {activeConversation.visitorName}
                    </h2>
                    {activeConversation.matchedGuestName && (
                      <Link
                        to="/admin/guests"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-800 text-[10px] font-semibold hover:bg-sky-100 transition"
                      >
                        <UserCheck className="w-3 h-3" />
                        Guest Profile: {activeConversation.matchedGuestName}
                      </Link>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600">
                    {activeConversation.visitorEmail && (
                      <a
                        href={`mailto:${activeConversation.visitorEmail}`}
                        className="inline-flex items-center gap-1 hover:text-amber-800 underline underline-offset-2"
                      >
                        <Mail className="w-3.5 h-3.5 text-stone-400" />
                        {activeConversation.visitorEmail}
                      </a>
                    )}
                    {activeConversation.visitorPhone && (
                      <a
                        href={`tel:${activeConversation.visitorPhone}`}
                        className="inline-flex items-center gap-1 hover:text-amber-800 underline underline-offset-2"
                      >
                        <Phone className="w-3.5 h-3.5 text-stone-400" />
                        {activeConversation.visitorPhone}
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeConversation.status === 'OPEN' ? (
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => void handleStatusToggle('RESOLVED')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-xs font-semibold text-stone-700 transition cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      Mark Resolved
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => void handleStatusToggle('OPEN')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-xs font-semibold text-amber-900 transition cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reopen Thread
                    </button>
                  )}
                </div>
              </div>

              {/* Messages Feed */}
              <div
                ref={messagesListRef}
                className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 max-h-[24rem] bg-[#FAF8F4]/50"
              >
                {loadingThread && messages.length === 0 ? (
                  <div className="py-12 flex items-center justify-center gap-2 text-xs text-stone-500">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-800" />
                    Loading conversation...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-stone-500 flex flex-col items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-stone-300" />
                    No messages in this conversation yet.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isStaff = msg.senderType === 'STAFF'
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isStaff ? 'items-end' : 'items-start'
                        }`}
                      >
                        <span className="text-[10px] text-stone-400 mb-1 px-1">
                          {isStaff
                            ? `${msg.senderName} (Staff)`
                            : msg.senderName}{' '}
                          · {formatMessageTimestamp(msg.createdAt)}
                        </span>
                        <div
                          className={`max-w-[80%] px-4 py-2.5 text-xs leading-relaxed whitespace-pre-wrap break-words ${
                            isStaff
                              ? 'bg-stone-900 text-white rounded-2xl rounded-br-xs'
                              : 'bg-white border border-stone-200 text-stone-800 rounded-2xl rounded-bl-xs shadow-2xs'
                          }`}
                        >
                          {msg.body}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Quick Replies + Reply Form */}
              <div className="p-3.5 border-t border-stone-200 bg-white space-y-2.5">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {STAFF_QUICK_REPLIES.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setReplyBody(preset)}
                      className="shrink-0 px-2.5 py-1 rounded-full border border-stone-200 bg-stone-50 hover:bg-amber-50 hover:border-amber-200 text-[11px] text-stone-700 transition cursor-pointer"
                    >
                      {preset.length > 42
                        ? `${preset.slice(0, 42)}...`
                        : preset}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={handleSendReply}
                  className="flex items-end gap-2.5"
                >
                  <label htmlFor="admin-chat-reply" className="sr-only">
                    Reply to guest
                  </label>
                  <textarea
                    id="admin-chat-reply"
                    rows={2}
                    maxLength={2000}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (replyBody.trim() && !sendingReply) {
                          void handleSendReply(e)
                        }
                      }
                    }}
                    placeholder={`Reply to ${activeConversation.visitorName}...`}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={!replyBody.trim() || sendingReply}
                    className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-amber-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    {sendingReply ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Send Reply
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
