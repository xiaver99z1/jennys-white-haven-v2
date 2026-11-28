import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Loader2,
  MessageCircle,
  Plus,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import { PhoneNumberInput } from '#/components/common/PhoneNumberInput'
import {
  CHAT_BACKGROUND_POLL_INTERVAL_MS,
  CHAT_OPEN_POLL_INTERVAL_MS,
  VISITOR_CHAT_TOKEN_KEY,
} from '#/lib/constants/chat'
import { formatChatTime, getErrorMessage } from '#/lib/formatters'
import { useI18n } from '#/lib/i18n'
import {
  getPublicChatState,
  sendVisitorChatMessage,
} from '#/server/chat-actions'
import type { ChatMessageItem, PublicChatConversation } from '#/types'

export { VISITOR_CHAT_TOKEN_KEY }

interface PublicChatWidgetProps {
  enableInitialSyncInTest?: boolean
}

export function PublicChatWidget({
  enableInitialSyncInTest = false,
}: PublicChatWidgetProps) {
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [staffOnline, setStaffOnline] = useState(false)
  const [visitorToken, setVisitorToken] = useState<string>('')
  const [conversation, setConversation] =
    useState<PublicChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessageItem[]>([])
  const [startingNew, setStartingNew] = useState(false)

  // Pre-chat onboarding states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [firstMessage, setFirstMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')

  // Follow-up composer state
  const [replyText, setReplyText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoadingState, setIsLoadingState] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesListRef = useRef<HTMLDivElement>(null)
  const isMountedRef = useRef(true)
  const visitorTokenRef = useRef<string>('')
  const isOpenRef = useRef<boolean>(false)
  isOpenRef.current = isOpen

  const readStoredToken = useCallback((): string => {
    if (typeof window === 'undefined') return ''
    try {
      return window.localStorage.getItem(VISITOR_CHAT_TOKEN_KEY) ?? ''
    } catch {
      return ''
    }
  }, [])

  const saveStoredToken = useCallback((token: string) => {
    visitorTokenRef.current = token
    setVisitorToken(token)
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(VISITOR_CHAT_TOKEN_KEY, token)
    } catch {
      // Retain token in memory even when storage writes are blocked
    }
  }, [])

  const syncChatState = useCallback(
    async (options?: {
      markRead?: boolean
      isWidgetOpen?: boolean
      tokenOverride?: string
    }) => {
      const requestToken =
        options?.tokenOverride ?? (visitorTokenRef.current || readStoredToken())
      const widgetOpenFlag = options?.isWidgetOpen ?? isOpenRef.current
      try {
        const res = await getPublicChatState({
          data: {
            visitorToken: requestToken || undefined,
            markRead: options?.markRead ?? false,
            isWidgetOpen: widgetOpenFlag,
          },
        })
        // Discard stale response if unmounted or if a newer inquiry rotated the active token
        if (!isMountedRef.current || requestToken !== visitorTokenRef.current) {
          return
        }
        setStaffOnline(res.staffOnline)
        if (res.conversation) {
          setConversation(res.conversation)
          setMessages(res.messages)
        }
      } catch {
        // Silently retain existing state on transient network errors
      }
    },
    [readStoredToken],
  )

  useEffect(() => {
    isMountedRef.current = true
    const stored = readStoredToken()
    visitorTokenRef.current = stored
    if (stored) {
      setVisitorToken(stored)
    }

    if (import.meta.env.MODE !== 'test' || enableInitialSyncInTest) {
      setIsLoadingState(true)
      void syncChatState({
        tokenOverride: stored,
        isWidgetOpen: false,
      }).finally(() => {
        if (isMountedRef.current) setIsLoadingState(false)
      })
    }

    return () => {
      isMountedRef.current = false
    }
  }, [enableInitialSyncInTest, readStoredToken, syncChatState])

  // Adaptive polling while chat is open (or slower background check when visitor has an active thread)
  useEffect(() => {
    if (import.meta.env.MODE === 'test') return

    const hasActiveThread = Boolean(
      conversation && conversation.status === 'OPEN',
    )
    if (!isOpen && !hasActiveThread) return

    const intervalMs = isOpen
      ? CHAT_OPEN_POLL_INTERVAL_MS
      : CHAT_BACKGROUND_POLL_INTERVAL_MS
    const timer = setInterval(() => {
      if (document.visibilityState === 'hidden') return
      void syncChatState({ markRead: isOpen, isWidgetOpen: isOpen })
    }, intervalMs)

    return () => clearInterval(timer)
  }, [isOpen, conversation, syncChatState])

  useEffect(() => {
    if (!isOpen) return
    const container = messagesListRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [isOpen, messages.length])

  function handleToggleOpen() {
    const nextOpen = !isOpen
    isOpenRef.current = nextOpen
    setIsOpen(nextOpen)
    setError(null)
    if (nextOpen) {
      void syncChatState({ markRead: true, isWidgetOpen: true })
    }
  }

  async function handleStartConversation(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSending(true)
    const submittedFirstMessage = firstMessage
    try {
      const activeToken =
        visitorTokenRef.current || visitorToken || readStoredToken()
      const res = await sendVisitorChatMessage({
        data: {
          visitorToken: activeToken || undefined,
          name,
          email: email || undefined,
          phone: phone || undefined,
          message: submittedFirstMessage,
          forceNewThread: startingNew,
          honeypot: honeypot || undefined,
        },
      })
      saveStoredToken(res.visitorToken)
      setStaffOnline(res.staffOnline)
      setConversation(res.conversation)
      setMessages([res.message])
      setFirstMessage((current) =>
        current === submittedFirstMessage ? '' : current,
      )
      setStartingNew(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to start conversation.'))
    } finally {
      setIsSending(false)
    }
  }

  async function handleSendReply(e: FormEvent) {
    e.preventDefault()
    const trimmed = replyText.trim()
    if (!trimmed || isSending) return
    const submittedDraft = replyText
    setError(null)
    setIsSending(true)
    try {
      const activeToken =
        visitorTokenRef.current || visitorToken || readStoredToken()
      const res = await sendVisitorChatMessage({
        data: {
          visitorToken: activeToken || undefined,
          message: trimmed,
        },
      })
      saveStoredToken(res.visitorToken)
      setStaffOnline(res.staffOnline)
      setConversation(res.conversation)
      setMessages((prev) =>
        prev.some((m) => m.id === res.message.id)
          ? prev
          : [...prev, res.message],
      )
      // Preserve any new text entered while the send request was pending
      setReplyText((current) =>
        current === submittedDraft || current.trim() === trimmed ? '' : current,
      )
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to send message.'))
    } finally {
      setIsSending(false)
    }
  }

  const unreadCount = isOpen ? 0 : (conversation?.unreadByVisitor ?? 0)
  const showConversationThread = Boolean(conversation) && !startingNew

  return (
    <div className="fixed bottom-5 right-4 sm:right-6 z-40 flex flex-col items-end">
      {/* Expanded Chat Panel */}
      {isOpen && (
        <div
          id="public-live-chat-panel"
          role="dialog"
          aria-label="Jenny's White Haven Chat Support"
          className="mb-3 w-[calc(100vw-2rem)] sm:w-96 max-h-[min(35rem,calc(100dvh-6.5rem))] rounded-3xl bg-[#FAF8F4] border border-stone-200/90 shadow-2xl flex flex-col overflow-hidden text-stone-900"
        >
          {/* Header */}
          <div className="bg-stone-900 text-[#FAF8F4] px-5 py-4 flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg leading-tight truncate">
                  Jenny&apos;s White Haven
                </h2>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-300">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    staffOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>
                  {staffOnline ? t.chat.onlineStatus : t.chat.awayStatus}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {showConversationThread && (
                <button
                  type="button"
                  onClick={() => {
                    setStartingNew(true)
                    setError(null)
                    if (conversation) {
                      setName(conversation.visitorName)
                      setEmail(conversation.visitorEmail ?? '')
                      setPhone(conversation.visitorPhone ?? '')
                    }
                  }}
                  title="Start a new inquiry"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-800 hover:bg-stone-700 text-[10px] uppercase tracking-wider font-semibold text-stone-200 transition cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  {t.chat.newBtn}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  isOpenRef.current = false
                  setIsOpen(false)
                }}
                aria-label="Minimize chat support"
                className="p-1.5 rounded-full text-stone-300 hover:text-white hover:bg-stone-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          {isLoadingState && !conversation ? (
            <div className="p-8 flex items-center justify-center text-xs text-stone-500 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-800" />
              {t.chat.connecting}
            </div>
          ) : !showConversationThread ? (
            <form
              onSubmit={handleStartConversation}
              className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 text-xs"
            >
              <p className="text-stone-600 leading-relaxed">
                {staffOnline ? t.chat.onlineIntro : t.chat.awayIntro}
              </p>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 font-medium"
                >
                  {error}
                </div>
              )}

              {/* Quick Topic Starters */}
              <div className="space-y-1.5">
                <span className="block text-[10px] uppercase tracking-[0.18em] text-stone-400 font-semibold">
                  {t.chat.quickQuestions}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {t.chat.quickTopics.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() =>
                        setFirstMessage((prev) =>
                          prev.trim() ? prev : `${topic} `,
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-stone-200/90 hover:border-amber-700/50 hover:bg-amber-50/40 text-[11px] text-stone-700 transition cursor-pointer"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Honeypot anti-bot field */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="hidden"
              />

              <div>
                <label
                  htmlFor="chat-visitor-name"
                  className="block text-[10px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1"
                >
                  {t.chat.yourName}
                </label>
                <input
                  id="chat-visitor-name"
                  type="text"
                  required
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Maria Santos"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
                />
              </div>

              <div className="space-y-2.5">
                <div>
                  <label
                    htmlFor="chat-visitor-email"
                    className="block text-[10px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1"
                  >
                    {t.chat.email}
                  </label>
                  <input
                    id="chat-visitor-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="guest@email.com"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
                  />
                </div>
                <div>
                  <label
                    htmlFor="chat-visitor-phone"
                    className="block text-[10px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1"
                  >
                    {t.chat.phoneViber}
                  </label>
                  <PhoneNumberInput
                    id="chat-visitor-phone"
                    size="sm"
                    value={phone}
                    onChange={setPhone}
                  />
                </div>
                <p className="text-[10px] text-stone-400">
                  {t.chat.followUpHint}
                </p>
              </div>

              <div>
                <label
                  htmlFor="chat-visitor-message"
                  className="block text-[10px] uppercase tracking-[0.16em] text-stone-500 font-semibold mb-1"
                >
                  {t.chat.message}
                </label>
                <textarea
                  id="chat-visitor-message"
                  required
                  rows={3}
                  maxLength={1500}
                  value={firstMessage}
                  onChange={(e) => setFirstMessage(e.target.value)}
                  placeholder={t.chat.messagePlaceholder}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                {startingNew && conversation && (
                  <button
                    type="button"
                    onClick={() => setStartingNew(false)}
                    className="px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
                  >
                    {t.chat.back}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-amber-900 text-[#FAF8F4] text-xs uppercase tracking-[0.16em] font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  {isSending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {isSending
                    ? t.chat.sending
                    : staffOnline
                      ? t.chat.startLiveChat
                      : t.chat.sendInquiry}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Messages Timeline */}
              <div
                ref={messagesListRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[14rem] max-h-80"
              >
                {!staffOnline && (
                  <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 px-3.5 py-2.5 text-[11px] text-amber-950 leading-relaxed">
                    {t.chat.offlineSavedBanner}
                  </div>
                )}

                {messages.map((msg) => {
                  const isVisitor = msg.senderType === 'VISITOR'
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isVisitor ? 'items-end' : 'items-start'
                      }`}
                    >
                      <span className="text-[10px] text-stone-400 mb-1 px-1">
                        {isVisitor
                          ? t.chat.you
                          : `${msg.senderName} · White Haven`}{' '}
                        · {formatChatTime(msg.createdAt)}
                      </span>
                      <div
                        className={`max-w-[85%] px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap break-words ${
                          isVisitor
                            ? 'bg-stone-900 text-[#FAF8F4] rounded-2xl rounded-br-xs'
                            : 'bg-white border border-stone-200/90 text-stone-800 rounded-2xl rounded-bl-xs shadow-2xs'
                        }`}
                      >
                        {msg.body}
                      </div>
                    </div>
                  )
                })}

                {conversation?.status === 'RESOLVED' && (
                  <div className="rounded-xl bg-stone-100 border border-stone-200 px-3 py-2 text-center text-[11px] text-stone-600">
                    {t.chat.resolvedNotice}
                  </div>
                )}
              </div>

              {error && (
                <div
                  role="alert"
                  className="mx-4 mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700"
                >
                  {error}
                </div>
              )}

              {/* Composer */}
              <form
                onSubmit={handleSendReply}
                className="p-3 bg-white border-t border-stone-200/80 flex items-end gap-2 shrink-0"
              >
                <label htmlFor="chat-reply-input" className="sr-only">
                  Write a message
                </label>
                <textarea
                  id="chat-reply-input"
                  rows={1}
                  maxLength={1500}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (replyText.trim() && !isSending) {
                        void handleSendReply(e)
                      }
                    }
                  }}
                  placeholder={t.chat.writeMessagePlaceholder}
                  className="flex-1 max-h-24 px-3 py-2 rounded-xl bg-[#FAF8F4] border border-stone-200 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700 resize-none"
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  disabled={!replyText.trim() || isSending}
                  className="h-9 w-9 rounded-xl bg-stone-900 hover:bg-amber-900 text-[#FAF8F4] flex items-center justify-center transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Floating Launcher Pill */}
      <button
        type="button"
        onClick={handleToggleOpen}
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'public-live-chat-panel' : undefined}
        aria-label={isOpen ? 'Close chat support' : 'Open chat support'}
        className="relative inline-flex items-center gap-2.5 h-12 px-4 sm:px-5 rounded-full bg-stone-900 hover:bg-amber-900 text-[#FAF8F4] shadow-xl border border-stone-700/60 transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
      >
        <span className="relative flex items-center justify-center">
          {isOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <MessageCircle className="w-5 h-5" />
          )}
          {!isOpen && (
            <span
              className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-stone-900 ${
                staffOnline ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
          )}
        </span>
        <span className="hidden sm:inline text-xs uppercase tracking-[0.16em] font-semibold">
          {isOpen ? t.chat.close : t.chat.chatWithUs}
        </span>
        {unreadCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 min-w-5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-bold text-center">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}
