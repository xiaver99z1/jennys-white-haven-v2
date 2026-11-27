import { createServerFn } from '@tanstack/react-start'
import { authSession } from '#/lib/auth-helpers'
import {
  EMAIL_REGEX,
  extractRequestClientMeta,
} from '#/lib/constants/auth'
import {
  generateActivationToken,
  hashActivationToken,
  sendChatInquiryAlertEmail,
  sendChatReplyToGuestEmail,
} from '#/lib/email'
import { formatFullName } from '#/lib/formatters'
import { prisma } from '#/lib/prisma'
import { createNotification } from '#/server/notification-actions'
import type {
  AdminChatConversationSummary,
  AdminChatInboxResponse,
  AdminChatThreadDetail,
  ChatMessageItem,
  ChatThreadStatus,
  PublicChatStateResponse,
} from '#/types'

export const STAFF_ONLINE_WINDOW_MS = 2 * 60 * 1000
export const EMAIL_ALERT_IDLE_COOLDOWN_MS = 30 * 60 * 1000
export const VISITOR_OFFLINE_EMAIL_THRESHOLD_MS = 2 * 60 * 1000
const VISITOR_TOKEN_REGEX = /^[a-f0-9]{64}$/
const MAX_VISITOR_MESSAGES_PER_MINUTE = 12
const MAX_NEW_THREADS_PER_IP_PER_MINUTE = 5
const ALERT_RECIPIENT_ROLES = new Set(['super_admin', 'owner', 'manager'])

function isValidVisitorToken(value: unknown): value is string {
  return typeof value === 'string' && VISITOR_TOKEN_REGEX.test(value.trim())
}

function buildPreview(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized
}

async function getOnlineStaffCount(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - STAFF_ONLINE_WINDOW_MS)
  return prisma.user.count({
    where: {
      banned: { not: true },
      chatAvailable: true,
      lastSeenAt: { gte: cutoff },
    },
  })
}

async function getRequestIpSafe(): Promise<string> {
  try {
    const { getRequestHeaders } = await import('@tanstack/react-start/server')
    return extractRequestClientMeta(getRequestHeaders()).ipAddress
  } catch {
    return 'unknown'
  }
}

async function resolveInquiryAlertRecipients(): Promise<string[]> {
  const staffUsers = await prisma.user.findMany({
    where: {
      emailVerified: true,
      banned: { not: true },
    },
    select: {
      email: true,
      role: true,
    },
  })

  const seenLower = new Set<string>()
  const recipients: string[] = []

  const addEmail = (raw?: string | null) => {
    const trimmed = raw?.trim()
    if (!trimmed) return
    const lower = trimmed.toLowerCase()
    if (seenLower.has(lower)) return
    seenLower.add(lower)
    recipients.push(trimmed)
  }

  addEmail(process.env.SMTP_USER)

  for (const staff of staffUsers) {
    const normalizedRole = (staff.role ?? '').toLowerCase()
    if (ALERT_RECIPIENT_ROLES.has(normalizedRole)) {
      addEmail(staff.email)
    }
  }

  return recipients
}

// ==========================================
// PUBLIC VISITOR CHAT HANDLERS
// ==========================================

export interface GetPublicChatStateInput {
  visitorToken?: string
  markRead?: boolean
}

export function validateGetPublicChatState(
  data?: GetPublicChatStateInput,
): GetPublicChatStateInput {
  return data ?? {}
}

export async function getPublicChatStateHandler({
  data,
}: {
  data?: GetPublicChatStateInput
}): Promise<PublicChatStateResponse> {
  const now = new Date()
  const rawToken = data?.visitorToken?.trim()
  const onlineCount = await getOnlineStaffCount(now)
  const staffOnline = onlineCount > 0

  if (!isValidVisitorToken(rawToken)) {
    return {
      staffOnline,
      conversation: null,
      messages: [],
    }
  }

  const tokenHash = hashActivationToken(rawToken)
  const conversation = await prisma.chatConversation.findFirst({
    where: { visitorTokenHash: tokenHash },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 150,
      },
    },
  })

  if (!conversation) {
    return {
      staffOnline,
      conversation: null,
      messages: [],
    }
  }

  const shouldClearUnread =
    Boolean(data?.markRead) && conversation.unreadByVisitor > 0

  await prisma.chatConversation.update({
    where: { id: conversation.id },
    data: {
      lastVisitorActiveAt: now,
      ...(shouldClearUnread ? { unreadByVisitor: 0 } : {}),
    },
  })

  return {
    staffOnline,
    conversation: {
      id: conversation.id,
      visitorName: conversation.visitorName,
      visitorEmail: conversation.visitorEmail,
      visitorPhone: conversation.visitorPhone,
      status: conversation.status,
      unreadByVisitor: shouldClearUnread ? 0 : conversation.unreadByVisitor,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
    },
    messages: conversation.messages.map(
      (m): ChatMessageItem => ({
        id: m.id,
        conversationId: m.conversationId,
        senderType: m.senderType,
        senderName: m.senderName,
        body: m.body,
        createdAt: m.createdAt,
      }),
    ),
  }
}

export const getPublicChatState = createServerFn({ method: 'POST' })
  .validator(validateGetPublicChatState)
  .handler(getPublicChatStateHandler)

export interface SendVisitorChatMessageInput {
  visitorToken?: string
  name?: string
  email?: string
  phone?: string
  message: string
  forceNewThread?: boolean
  honeypot?: string
}

export function validateSendVisitorChatMessage(
  data: SendVisitorChatMessageInput,
): SendVisitorChatMessageInput {
  if (data.honeypot && data.honeypot.trim().length > 0) {
    throw new Error('Spam submission blocked.')
  }
  const message = data.message.trim()
  if (!message) {
    throw new Error('Please enter a message.')
  }
  if (message.length > 1500) {
    throw new Error('Message must be 1,500 characters or fewer.')
  }
  return {
    ...data,
    message,
  }
}

export async function sendVisitorChatMessageHandler({
  data,
}: {
  data: SendVisitorChatMessageInput
}): Promise<{
  visitorToken: string
  staffOnline: boolean
  conversation: NonNullable<PublicChatStateResponse['conversation']>
  message: ChatMessageItem
}> {
  const validated = validateSendVisitorChatMessage(data)
  const now = new Date()
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)

  let rawToken = validated.visitorToken?.trim() ?? ''
  let tokenHash = ''
  if (!validated.forceNewThread && isValidVisitorToken(rawToken)) {
    tokenHash = hashActivationToken(rawToken)
  } else {
    const generated = generateActivationToken()
    rawToken = generated.rawToken
    tokenHash = generated.tokenHash
  }

  const existingConversation = validated.forceNewThread
    ? null
    : await prisma.chatConversation.findFirst({
        where: { visitorTokenHash: tokenHash },
        orderBy: { updatedAt: 'desc' },
      })

  const preview = buildPreview(validated.message)
  const ipAddress = await getRequestIpSafe()

  let activeConversation = existingConversation
  let isNewConversation = false

  if (!activeConversation) {
    isNewConversation = true
    const visitorName = (validated.name ?? '').trim()
    const visitorEmail = (validated.email ?? '').trim() || null
    const visitorPhone = (validated.phone ?? '').trim() || null

    if (visitorName.length < 2 || visitorName.length > 80) {
      throw new Error('Please enter your name (2–80 characters).')
    }
    if (!visitorEmail && !visitorPhone) {
      throw new Error(
        'Please provide an email address or phone number so we can follow up.',
      )
    }
    if (visitorEmail && !EMAIL_REGEX.test(visitorEmail)) {
      throw new Error('Please enter a valid email address.')
    }
    if (visitorPhone && (visitorPhone.length < 7 || visitorPhone.length > 30)) {
      throw new Error('Please enter a valid phone number.')
    }

    if (ipAddress !== 'unknown') {
      const recentThreadsFromIp = await prisma.chatConversation.count({
        where: {
          ipAddress,
          createdAt: { gte: oneMinuteAgo },
        },
      })
      if (recentThreadsFromIp >= MAX_NEW_THREADS_PER_IP_PER_MINUTE) {
        throw new Error(
          'Too many new chat sessions started. Please wait a moment and try again.',
        )
      }
    }

    activeConversation = await prisma.chatConversation.create({
      data: {
        visitorTokenHash: tokenHash,
        visitorName,
        visitorEmail,
        visitorPhone,
        status: 'OPEN',
        unreadByStaff: 0,
        unreadByVisitor: 0,
        lastMessageAt: now,
        lastMessagePreview: preview,
        lastVisitorActiveAt: now,
        ipAddress,
      },
    })
  } else {
    const recentMessagesCount = await prisma.chatMessage.count({
      where: {
        conversationId: activeConversation.id,
        senderType: 'VISITOR',
        createdAt: { gte: oneMinuteAgo },
      },
    })
    if (recentMessagesCount >= MAX_VISITOR_MESSAGES_PER_MINUTE) {
      throw new Error(
        'Too many messages sent. Please wait a moment before sending another.',
      )
    }
  }

  const shouldSendAlert =
    isNewConversation ||
    activeConversation.status === 'RESOLVED' ||
    !activeConversation.lastAlertSentAt ||
    now.getTime() - activeConversation.lastAlertSentAt.getTime() >=
      EMAIL_ALERT_IDLE_COOLDOWN_MS

  const [createdMessage, updatedConversation, onlineCount] = await Promise.all([
    prisma.chatMessage.create({
      data: {
        conversationId: activeConversation.id,
        senderType: 'VISITOR',
        senderName: activeConversation.visitorName,
        body: validated.message,
      },
    }),
    prisma.chatConversation.update({
      where: { id: activeConversation.id },
      data: {
        status: 'OPEN',
        unreadByStaff: { increment: 1 },
        unreadByVisitor: 0,
        lastMessageAt: now,
        lastMessagePreview: preview,
        lastVisitorActiveAt: now,
        ...(shouldSendAlert ? { lastAlertSentAt: now } : {}),
      },
    }),
    getOnlineStaffCount(now),
  ])

  if (shouldSendAlert) {
    await createNotification({
      type: 'CHAT_INQUIRY',
      title: isNewConversation
        ? `New Chat Inquiry: ${updatedConversation.visitorName}`
        : `Chat Follow-up: ${updatedConversation.visitorName}`,
      message: preview,
      href: '/admin/chat',
    })

    try {
      const recipients = await resolveInquiryAlertRecipients()
      await sendChatInquiryAlertEmail({
        recipients,
        visitorName: updatedConversation.visitorName,
        visitorEmail: updatedConversation.visitorEmail,
        visitorPhone: updatedConversation.visitorPhone,
        messageBody: validated.message,
        conversationId: updatedConversation.id,
      })
    } catch (error) {
      console.error('Failed to send chat inquiry alert email:', error)
    }
  }

  return {
    visitorToken: rawToken,
    staffOnline: onlineCount > 0,
    conversation: {
      id: updatedConversation.id,
      visitorName: updatedConversation.visitorName,
      visitorEmail: updatedConversation.visitorEmail,
      visitorPhone: updatedConversation.visitorPhone,
      status: updatedConversation.status,
      unreadByVisitor: updatedConversation.unreadByVisitor,
      lastMessageAt: updatedConversation.lastMessageAt,
      createdAt: updatedConversation.createdAt,
    },
    message: {
      id: createdMessage.id,
      conversationId: createdMessage.conversationId,
      senderType: createdMessage.senderType,
      senderName: createdMessage.senderName,
      body: createdMessage.body,
      createdAt: createdMessage.createdAt,
    },
  }
}

export const sendVisitorChatMessage = createServerFn({ method: 'POST' })
  .validator(validateSendVisitorChatMessage)
  .handler(sendVisitorChatMessageHandler)

// ==========================================
// ADMIN PRESENCE & INBOX HANDLERS
// ==========================================

export interface HeartbeatAdminPresenceInput {
  setAvailable?: boolean
}

export function validateHeartbeatAdminPresence(
  data?: HeartbeatAdminPresenceInput,
): HeartbeatAdminPresenceInput {
  return data ?? {}
}

export async function heartbeatAdminPresenceHandler({
  data,
}: {
  data?: HeartbeatAdminPresenceInput
}): Promise<{
  chatAvailable: boolean
  unreadThreadsCount: number
  unreadMessagesCount: number
}> {
  const session = await authSession()
  const now = new Date()

  const [updatedUser, unreadAgg, unreadThreadsCount] = await Promise.all([
    prisma.user.update({
      where: { id: session.user.id },
      data: {
        lastSeenAt: now,
        ...(typeof data?.setAvailable === 'boolean'
          ? { chatAvailable: data.setAvailable }
          : {}),
      },
      select: { chatAvailable: true },
    }),
    prisma.chatConversation.aggregate({
      _sum: { unreadByStaff: true },
      where: { unreadByStaff: { gt: 0 } },
    }),
    prisma.chatConversation.count({
      where: { unreadByStaff: { gt: 0 } },
    }),
  ])

  return {
    chatAvailable: updatedUser.chatAvailable,
    unreadThreadsCount,
    unreadMessagesCount: unreadAgg._sum.unreadByStaff ?? 0,
  }
}

export const heartbeatAdminPresence = createServerFn({ method: 'POST' })
  .validator(validateHeartbeatAdminPresence)
  .handler(heartbeatAdminPresenceHandler)

export interface GetAdminChatInboxInput {
  status?: 'ALL' | ChatThreadStatus
  search?: string
}

export function validateGetAdminChatInbox(
  data?: GetAdminChatInboxInput,
): GetAdminChatInboxInput {
  return data ?? {}
}

export async function getAdminChatInboxHandler({
  data,
}: {
  data?: GetAdminChatInboxInput
}): Promise<AdminChatInboxResponse> {
  const session = await authSession()
  const now = new Date()

  const statusFilter =
    data?.status && data.status !== 'ALL' ? { status: data.status } : {}
  const q = data?.search?.trim() ?? ''
  const searchFilter =
    q.length > 0
      ? {
          OR: [
            { visitorName: { contains: q, mode: 'insensitive' as const } },
            { visitorEmail: { contains: q, mode: 'insensitive' as const } },
            { visitorPhone: { contains: q, mode: 'insensitive' as const } },
            {
              lastMessagePreview: { contains: q, mode: 'insensitive' as const },
            },
          ],
        }
      : {}

  const [
    updatedUser,
    conversations,
    unreadThreadsCount,
    unreadAgg,
    onlineStaffCount,
  ] = await Promise.all([
    prisma.user.update({
      where: { id: session.user.id },
      data: { lastSeenAt: now },
      select: { chatAvailable: true },
    }),
    prisma.chatConversation.findMany({
      where: {
        ...statusFilter,
        ...searchFilter,
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
    }),
    prisma.chatConversation.count({
      where: { unreadByStaff: { gt: 0 } },
    }),
    prisma.chatConversation.aggregate({
      _sum: { unreadByStaff: true },
      where: { unreadByStaff: { gt: 0 } },
    }),
    getOnlineStaffCount(now),
  ])

  const emails = Array.from(
    new Set(
      conversations
        .map((c) => c.visitorEmail?.trim().toLowerCase())
        .filter((v): v is string => Boolean(v)),
    ),
  )
  const phones = Array.from(
    new Set(
      conversations
        .map((c) => c.visitorPhone?.trim())
        .filter((v): v is string => Boolean(v)),
    ),
  )

  const matchedGuests =
    emails.length > 0 || phones.length > 0
      ? await prisma.guest.findMany({
          where: {
            deletedAt: null,
            OR: [
              ...(emails.length > 0
                ? emails.map((email) => ({
                    email: { equals: email, mode: 'insensitive' as const },
                  }))
                : []),
              ...(phones.length > 0 ? [{ phone: { in: phones } }] : []),
            ],
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        })
      : []

  const guestByEmail = new Map<string, { id: string; name: string }>()
  const guestByPhone = new Map<string, { id: string; name: string }>()
  for (const guest of matchedGuests) {
    const summary = {
      id: guest.id,
      name: formatFullName(guest.firstName, guest.lastName),
    }
    if (guest.email) {
      guestByEmail.set(guest.email.trim().toLowerCase(), summary)
    }
    if (guest.phone) {
      guestByPhone.set(guest.phone.trim(), summary)
    }
  }

  return {
    conversations: conversations.map((c): AdminChatConversationSummary => {
      const matched =
        (c.visitorEmail
          ? guestByEmail.get(c.visitorEmail.trim().toLowerCase())
          : undefined) ??
        (c.visitorPhone ? guestByPhone.get(c.visitorPhone.trim()) : undefined)

      return {
        id: c.id,
        visitorName: c.visitorName,
        visitorEmail: c.visitorEmail,
        visitorPhone: c.visitorPhone,
        status: c.status,
        unreadByStaff: c.unreadByStaff,
        lastMessageAt: c.lastMessageAt,
        lastMessagePreview: c.lastMessagePreview,
        createdAt: c.createdAt,
        matchedGuestId: matched?.id ?? null,
        matchedGuestName: matched?.name ?? null,
      }
    }),
    unreadThreadsCount,
    unreadMessagesCount: unreadAgg._sum.unreadByStaff ?? 0,
    chatAvailable: updatedUser.chatAvailable,
    onlineStaffCount,
  }
}

export const getAdminChatInbox = createServerFn({ method: 'GET' })
  .validator(validateGetAdminChatInbox)
  .handler(getAdminChatInboxHandler)

export function validateConversationId(data: { conversationId: string }) {
  if (!data.conversationId.trim()) {
    throw new Error('Conversation ID is required.')
  }
  return { conversationId: data.conversationId.trim() }
}

export async function getAdminChatThreadHandler({
  data,
}: {
  data: { conversationId: string }
}): Promise<AdminChatThreadDetail> {
  const session = await authSession()
  const { conversationId } = validateConversationId(data)
  const now = new Date()

  const [conversation] = await Promise.all([
    prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 250,
        },
      },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { lastSeenAt: now },
      select: { id: true },
    }),
  ])

  if (!conversation) {
    throw new Error('Conversation not found.')
  }

  if (conversation.unreadByStaff > 0) {
    await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: { unreadByStaff: 0 },
    })
  }

  const matchedGuest =
    conversation.visitorEmail || conversation.visitorPhone
      ? await prisma.guest.findFirst({
          where: {
            deletedAt: null,
            OR: [
              ...(conversation.visitorEmail
                ? [
                    {
                      email: {
                        equals: conversation.visitorEmail.trim(),
                        mode: 'insensitive' as const,
                      },
                    },
                  ]
                : []),
              ...(conversation.visitorPhone
                ? [{ phone: conversation.visitorPhone.trim() }]
                : []),
            ],
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        })
      : null

  return {
    conversation: {
      id: conversation.id,
      visitorName: conversation.visitorName,
      visitorEmail: conversation.visitorEmail,
      visitorPhone: conversation.visitorPhone,
      status: conversation.status,
      unreadByStaff: 0,
      lastMessageAt: conversation.lastMessageAt,
      lastMessagePreview: conversation.lastMessagePreview,
      createdAt: conversation.createdAt,
      matchedGuestId: matchedGuest?.id ?? null,
      matchedGuestName: matchedGuest
        ? formatFullName(matchedGuest.firstName, matchedGuest.lastName)
        : null,
    },
    messages: conversation.messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderType: m.senderType,
      senderName: m.senderName,
      body: m.body,
      createdAt: m.createdAt,
    })),
  }
}

export const getAdminChatThread = createServerFn({ method: 'GET' })
  .validator(validateConversationId)
  .handler(getAdminChatThreadHandler)

export interface SendAdminChatReplyInput {
  conversationId: string
  body: string
}

export function validateSendAdminChatReply(
  data: SendAdminChatReplyInput,
): SendAdminChatReplyInput {
  const conversationId = data.conversationId.trim()
  const body = data.body.trim()
  if (!conversationId) {
    throw new Error('Conversation ID is required.')
  }
  if (!body) {
    throw new Error('Please enter a reply message.')
  }
  if (body.length > 2000) {
    throw new Error('Reply must be 2,000 characters or fewer.')
  }
  return { conversationId, body }
}

export async function sendAdminChatReplyHandler({
  data,
}: {
  data: SendAdminChatReplyInput
}): Promise<ChatMessageItem> {
  const session = await authSession()
  const { conversationId, body } = validateSendAdminChatReply(data)
  const now = new Date()

  const existing = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
  })
  if (!existing) {
    throw new Error('Conversation not found.')
  }

  const staffName = session.user.name.trim() || 'Resort Team'
  const preview = buildPreview(body)

  const [createdMessage] = await Promise.all([
    prisma.chatMessage.create({
      data: {
        conversationId,
        senderType: 'STAFF',
        senderName: staffName,
        senderUserId: session.user.id,
        body,
      },
    }),
    prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        status: 'OPEN',
        unreadByStaff: 0,
        unreadByVisitor: { increment: 1 },
        lastMessageAt: now,
        lastMessagePreview: preview,
      },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { lastSeenAt: now },
      select: { id: true },
    }),
  ])

  const visitorIsLikelyOffline =
    now.getTime() - existing.lastVisitorActiveAt.getTime() >=
    VISITOR_OFFLINE_EMAIL_THRESHOLD_MS

  if (existing.visitorEmail && visitorIsLikelyOffline) {
    try {
      await sendChatReplyToGuestEmail({
        to: existing.visitorEmail,
        visitorName: existing.visitorName,
        staffName,
        replyBody: body,
      })
    } catch (error) {
      console.error('Failed to send chat reply email to guest:', error)
    }
  }

  return {
    id: createdMessage.id,
    conversationId: createdMessage.conversationId,
    senderType: createdMessage.senderType,
    senderName: createdMessage.senderName,
    body: createdMessage.body,
    createdAt: createdMessage.createdAt,
  }
}

export const sendAdminChatReply = createServerFn({ method: 'POST' })
  .validator(validateSendAdminChatReply)
  .handler(sendAdminChatReplyHandler)

export interface UpdateAdminChatStatusInput {
  conversationId: string
  status: ChatThreadStatus
}

export function validateUpdateAdminChatStatus(
  data: UpdateAdminChatStatusInput,
): UpdateAdminChatStatusInput {
  const conversationId = data.conversationId.trim()
  if (!conversationId) {
    throw new Error('Conversation ID is required.')
  }
  const rawStatus: string = data.status
  if (rawStatus !== 'OPEN' && rawStatus !== 'RESOLVED') {
    throw new Error('Invalid chat thread status.')
  }
  return { conversationId, status: data.status }
}

export async function updateAdminChatStatusHandler({
  data,
}: {
  data: UpdateAdminChatStatusInput
}): Promise<{ success: true; status: ChatThreadStatus }> {
  await authSession()
  const { conversationId, status } = validateUpdateAdminChatStatus(data)

  await prisma.chatConversation.update({
    where: { id: conversationId },
    data: {
      status,
      ...(status === 'RESOLVED' ? { unreadByStaff: 0 } : {}),
    },
  })

  return { success: true, status }
}

export const updateAdminChatStatus = createServerFn({ method: 'POST' })
  .validator(validateUpdateAdminChatStatus)
  .handler(updateAdminChatStatusHandler)
