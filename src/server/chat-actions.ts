import { createServerFn } from '@tanstack/react-start'
import { extractRequestClientMeta } from '#/lib/constants/auth'
import {
  ADMIN_MESSAGE_PAGE_SIZE,
  CHAT_ALERT_RECIPIENT_ROLES,
  EMAIL_ALERT_IDLE_COOLDOWN_MS,
  MAX_NEW_THREADS_PER_IP_PER_MINUTE,
  MAX_VISITOR_MESSAGES_PER_MINUTE,
  PUBLIC_MESSAGE_PAGE_SIZE,
  STAFF_ONLINE_WINDOW_MS,
  VISITOR_OFFLINE_EMAIL_THRESHOLD_MS,
  VISITOR_TOKEN_REGEX,
} from '#/lib/constants/chat'
import {
  generateActivationToken,
  hashActivationToken,
  isSingleMailboxEmail,
  sendChatInquiryAlertEmail,
  sendChatReplyToGuestEmail,
} from '#/lib/email'
import { formatFullName } from '#/lib/formatters'
import { normalizePhoneForStorage, phonesMatch } from '#/lib/phone'
import { prisma } from '#/lib/prisma'
import { requirePermission } from '#/lib/require-permission'
import { validatePersonName, validatePhoneField } from '#/lib/validation'
import type {
  AdminChatConversationSummary,
  AdminChatInboxResponse,
  AdminChatThreadDetail,
  ChatMessageItem,
  ChatThreadStatus,
  PublicChatStateResponse,
} from '#/types'

export {
  ADMIN_MESSAGE_PAGE_SIZE,
  EMAIL_ALERT_IDLE_COOLDOWN_MS,
  PUBLIC_MESSAGE_PAGE_SIZE,
  STAFF_ONLINE_WINDOW_MS,
  VISITOR_OFFLINE_EMAIL_THRESHOLD_MS,
}

export async function requireChatPermission() {
  return requirePermission('manage:chat')
}

function isValidVisitorToken(value: unknown): value is string {
  return typeof value === 'string' && VISITOR_TOKEN_REGEX.test(value.trim())
}

function buildPreview(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  return normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized
}

async function getOnlineStaffCountSafe(now = new Date()): Promise<number> {
  try {
    const cutoff = new Date(now.getTime() - STAFF_ONLINE_WINDOW_MS)
    return await prisma.user.count({
      where: {
        banned: { not: true },
        chatAvailable: true,
        lastSeenAt: { gte: cutoff },
      },
    })
  } catch {
    return 0
  }
}

async function getRequestIpSafe(): Promise<string> {
  try {
    const { getRequestHeaders } = await import('@tanstack/react-start/server')
    return extractRequestClientMeta(getRequestHeaders()).ipAddress
  } catch {
    return 'unknown'
  }
}

async function acquireRateLimitLock(
  tx: { $executeRaw?: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown> },
  key: string,
) {
  if (typeof tx.$executeRaw === 'function') {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`
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
    if (CHAT_ALERT_RECIPIENT_ROLES.has(normalizedRole)) {
      addEmail(staff.email)
    }
  }

  return recipients
}

interface RawMessageRecord {
  id: string
  conversationId: string
  senderType: 'VISITOR' | 'STAFF'
  senderName: string
  body: string
  createdAt: Date
}

function toChronologicalPage(
  descendingRows: RawMessageRecord[],
  pageSize: number,
): {
  messages: ChatMessageItem[]
  olderCursor: string | null
  newestMessage: RawMessageRecord | undefined
} {
  const hasOlder = descendingRows.length > pageSize
  const sliced = hasOlder ? descendingRows.slice(0, pageSize) : descendingRows
  const chronological = [...sliced].reverse()
  return {
    messages: chronological.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderType: m.senderType,
      senderName: m.senderName,
      body: m.body,
      createdAt: m.createdAt,
    })),
    olderCursor: hasOlder ? (chronological.at(0)?.id ?? null) : null,
    newestMessage: chronological.at(-1),
  }
}

async function acknowledgeUnreadThroughMessage(options: {
  conversationId: string
  observedLastMessageAt: Date
  counterField: 'unreadByVisitor' | 'unreadByStaff'
  unreadSenderType: 'STAFF' | 'VISITOR'
  newestReturnedMessage: RawMessageRecord | undefined
  additionalData?: Record<string, unknown>
}): Promise<number> {
  const {
    conversationId,
    observedLastMessageAt,
    counterField,
    unreadSenderType,
    newestReturnedMessage,
    additionalData = {},
  } = options

  // Fast atomic conditional clear when no newer message arrived during the read
  const conditionalRes = await prisma.chatConversation.updateMany({
    where: {
      id: conversationId,
      lastMessageAt: observedLastMessageAt,
    },
    data: {
      [counterField]: 0,
      ...additionalData,
    },
  })

  if (conditionalRes.count > 0) {
    return 0
  }

  // Concurrent message arrived: preserve unread count for messages strictly newer than the last returned message
  const remainingUnread = await prisma.chatMessage.count({
    where: {
      conversationId,
      senderType: unreadSenderType,
      ...(newestReturnedMessage
        ? {
            OR: [
              { createdAt: { gt: newestReturnedMessage.createdAt } },
              {
                createdAt: newestReturnedMessage.createdAt,
                id: { gt: newestReturnedMessage.id },
              },
            ],
          }
        : {}),
    },
  })

  await prisma.chatConversation.update({
    where: { id: conversationId },
    data: {
      [counterField]: remainingUnread,
      ...additionalData,
    },
  })

  return remainingUnread
}

async function dispatchPendingInquiryEmail(params: {
  conversationId: string
  messageId: string
  visitorName: string
  visitorEmail: string | null
  visitorPhone: string | null
  messageBody: string
}) {
  try {
    const recipients = await resolveInquiryAlertRecipients()
    await sendChatInquiryAlertEmail({
      recipients,
      visitorName: params.visitorName,
      visitorEmail: params.visitorEmail,
      visitorPhone: params.visitorPhone,
      messageBody: params.messageBody,
      conversationId: params.conversationId,
    })
    const sentAt = new Date()
    await prisma.chatConversation.updateMany({
      where: {
        id: params.conversationId,
        pendingEmailAlertMessageId: params.messageId,
      },
      data: {
        lastEmailAlertSentAt: sentAt,
        lastAlertSentAt: sentAt,
        pendingEmailAlertMessageId: null,
      },
    })
  } catch (error) {
    console.error('Failed to send chat inquiry alert email (retained for retry):', error)
  }
}

async function dispatchPendingGuestReplyEmail(params: {
  messageId: string
  to: string
  visitorName: string
  staffName: string
  replyBody: string
}) {
  try {
    await sendChatReplyToGuestEmail({
      to: params.to,
      visitorName: params.visitorName,
      staffName: params.staffName,
      replyBody: params.replyBody,
    })
    await prisma.chatMessage.updateMany({
      where: {
        id: params.messageId,
        guestEmailPending: true,
      },
      data: {
        guestEmailPending: false,
        guestEmailSentAt: new Date(),
      },
    })
  } catch (error) {
    console.error('Failed to send chat reply email to guest (retained for retry):', error)
  }
}

// ==========================================
// PUBLIC VISITOR CHAT HANDLERS
// ==========================================

export interface GetPublicChatStateInput {
  visitorToken?: string
  markRead?: boolean
  isWidgetOpen?: boolean
  beforeMessageId?: string
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
  const onlineCount = await getOnlineStaffCountSafe(now)
  const staffOnline = onlineCount > 0

  if (!isValidVisitorToken(rawToken)) {
    return {
      staffOnline,
      conversation: null,
      messages: [],
      olderCursor: null,
    }
  }

  const tokenHash = hashActivationToken(rawToken)
  const cursorId = data?.beforeMessageId?.trim() || undefined

  const conversation = await prisma.chatConversation.findUnique({
    where: { visitorTokenHash: tokenHash },
    include: {
      messages: {
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: PUBLIC_MESSAGE_PAGE_SIZE + 1,
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      },
    },
  })

  if (!conversation) {
    return {
      staffOnline,
      conversation: null,
      messages: [],
      olderCursor: null,
    }
  }

  const { messages, olderCursor, newestMessage } = toChronologicalPage(
    conversation.messages,
    PUBLIC_MESSAGE_PAGE_SIZE,
  )

  const activelyViewing = Boolean(data?.isWidgetOpen || data?.markRead)
  const shouldClearUnread =
    Boolean(data?.markRead) &&
    !cursorId &&
    conversation.unreadByVisitor > 0

  let nextUnread = conversation.unreadByVisitor

  if (shouldClearUnread) {
    nextUnread = await acknowledgeUnreadThroughMessage({
      conversationId: conversation.id,
      observedLastMessageAt: conversation.lastMessageAt,
      counterField: 'unreadByVisitor',
      unreadSenderType: 'STAFF',
      newestReturnedMessage: newestMessage,
      additionalData: activelyViewing ? { lastVisitorActiveAt: now } : {},
    })
  } else if (activelyViewing) {
    await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: { lastVisitorActiveAt: now },
    })
  }

  return {
    staffOnline,
    conversation: {
      id: conversation.id,
      visitorName: conversation.visitorName,
      visitorEmail: conversation.visitorEmail,
      visitorPhone: conversation.visitorPhone,
      status: conversation.status,
      unreadByVisitor: nextUnread,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
    },
    messages,
    olderCursor,
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
  const alertCooldownCutoff = new Date(
    now.getTime() - EMAIL_ALERT_IDLE_COOLDOWN_MS,
  )

  const candidateToken = validated.visitorToken?.trim() ?? ''
  const lookupHash =
    !validated.forceNewThread && isValidVisitorToken(candidateToken)
      ? hashActivationToken(candidateToken)
      : null

  const preview = buildPreview(validated.message)
  const ipAddress = await getRequestIpSafe()

  const txResult = await prisma.$transaction(async (tx) => {
    const existingConversation = lookupHash
      ? await tx.chatConversation.findUnique({
          where: { visitorTokenHash: lookupHash },
        })
      : null

    let rawToken = candidateToken
    let activeConversation = existingConversation
    let isNewConversation = false
    const wasResolved = existingConversation?.status === 'RESOLVED'

    if (!activeConversation) {
      isNewConversation = true
      const visitorName = (validated.name ?? '').trim()
      const visitorEmail = (validated.email ?? '').trim() || null
      const rawVisitorPhone = (validated.phone ?? '').trim()
      const visitorPhone = rawVisitorPhone
        ? normalizePhoneForStorage(rawVisitorPhone)
        : null

      const visitorNameErr = validatePersonName(visitorName, {
        label: 'Name',
        maxLength: 80,
      })
      if (visitorNameErr) {
        throw new Error(visitorNameErr)
      }
      if (!visitorEmail && !rawVisitorPhone) {
        throw new Error(
          'Please provide an email address or phone number so we can follow up.',
        )
      }
      if (visitorEmail && !isSingleMailboxEmail(visitorEmail)) {
        throw new Error('Please enter a valid single email address.')
      }
      if (rawVisitorPhone) {
        const visitorPhoneErr = validatePhoneField(rawVisitorPhone, {
          required: false,
        })
        if (
          visitorPhoneErr ||
          !visitorPhone ||
          visitorPhone.length < 8 ||
          visitorPhone.length > 16
        ) {
          throw new Error(visitorPhoneErr || 'Please enter a valid phone number.')
        }
      }

      if (ipAddress !== 'unknown') {
        await acquireRateLimitLock(tx, `chat:new-ip:${ipAddress}`)
        const recentThreadsFromIp = await tx.chatConversation.count({
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

      // Always mint a fresh server-generated token for every new conversation
      const generated = generateActivationToken()
      rawToken = generated.rawToken

      activeConversation = await tx.chatConversation.create({
        data: {
          visitorTokenHash: generated.tokenHash,
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
      await acquireRateLimitLock(tx, `chat:thread:${activeConversation.id}`)
      const recentMessagesCount = await tx.chatMessage.count({
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

    const createdMessage = await tx.chatMessage.create({
      data: {
        conversationId: activeConversation.id,
        senderType: 'VISITOR',
        senderName: activeConversation.visitorName,
        body: validated.message,
      },
    })

    // Preserve unreadByVisitor on send (do not treat sending as reading unseen staff replies)
    const updatedConversation = await tx.chatConversation.update({
      where: { id: activeConversation.id },
      data: {
        status: 'OPEN',
        unreadByStaff: { increment: 1 },
        lastMessageAt: now,
        lastMessagePreview: preview,
        lastVisitorActiveAt: now,
      },
    })

    return {
      rawToken,
      isNewConversation,
      wasResolved,
      previousAppAlertAt: activeConversation.lastAppAlertSentAt,
      previousEmailAlertAt: activeConversation.lastEmailAlertSentAt,
      previousPendingEmailId: activeConversation.pendingEmailAlertMessageId,
      createdMessage,
      updatedConversation,
    }
  })

  // 1. Atomic claim + independent retry tracking for In-App Notification channel
  const appAlertEligibleCondition = txResult.wasResolved
    ? { id: txResult.updatedConversation.id }
    : {
        id: txResult.updatedConversation.id,
        OR: [
          { lastAppAlertSentAt: null },
          { lastAppAlertSentAt: { lte: alertCooldownCutoff } },
        ],
      }

  try {
    const appClaim = await prisma.chatConversation.updateMany({
      where: appAlertEligibleCondition,
      data: { lastAppAlertSentAt: now },
    })

    if (appClaim.count > 0) {
      try {
        await prisma.notification.create({
          data: {
            type: 'CHAT_INQUIRY',
            title: txResult.isNewConversation
              ? `New Chat Inquiry: ${txResult.updatedConversation.visitorName}`
              : `Chat Follow-up: ${txResult.updatedConversation.visitorName}`,
            message: preview,
            href: '/admin/chat',
          },
        })
      } catch (notifErr) {
        // Restore previous marker so failed in-app notification remains eligible for retry
        await prisma.chatConversation.updateMany({
          where: {
            id: txResult.updatedConversation.id,
            lastAppAlertSentAt: now,
          },
          data: { lastAppAlertSentAt: txResult.previousAppAlertAt ?? null },
        })
        console.error('Failed to persist in-app chat notification:', notifErr)
      }
    }
  } catch (err) {
    console.error('App alert claim check failed:', err)
  }

  // 2. Atomic durable claim + non-blocking background dispatch for Email Alert channel
  const emailAlertEligibleCondition = txResult.wasResolved
    ? { id: txResult.updatedConversation.id }
    : {
        id: txResult.updatedConversation.id,
        OR: [
          { lastEmailAlertSentAt: null },
          { lastEmailAlertSentAt: { lte: alertCooldownCutoff } },
          { pendingEmailAlertMessageId: { not: null } },
        ],
      }

  try {
    const emailClaim = await prisma.chatConversation.updateMany({
      where: emailAlertEligibleCondition,
      data: {
        pendingEmailAlertMessageId: txResult.createdMessage.id,
      },
    })

    if (emailClaim.count > 0) {
      // Fire asynchronously without blocking the committed chat response
      void dispatchPendingInquiryEmail({
        conversationId: txResult.updatedConversation.id,
        messageId: txResult.createdMessage.id,
        visitorName: txResult.updatedConversation.visitorName,
        visitorEmail: txResult.updatedConversation.visitorEmail,
        visitorPhone: txResult.updatedConversation.visitorPhone,
        messageBody: validated.message,
      })
    }
  } catch (err) {
    console.error('Email alert claim check failed:', err)
  }

  const onlineCount = await getOnlineStaffCountSafe(now)

  return {
    visitorToken: txResult.rawToken,
    staffOnline: onlineCount > 0,
    conversation: {
      id: txResult.updatedConversation.id,
      visitorName: txResult.updatedConversation.visitorName,
      visitorEmail: txResult.updatedConversation.visitorEmail,
      visitorPhone: txResult.updatedConversation.visitorPhone,
      status: txResult.updatedConversation.status,
      unreadByVisitor: txResult.updatedConversation.unreadByVisitor,
      lastMessageAt: txResult.updatedConversation.lastMessageAt,
      createdAt: txResult.updatedConversation.createdAt,
    },
    message: {
      id: txResult.createdMessage.id,
      conversationId: txResult.createdMessage.conversationId,
      senderType: txResult.createdMessage.senderType,
      senderName: txResult.createdMessage.senderName,
      body: txResult.createdMessage.body,
      createdAt: txResult.createdMessage.createdAt,
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
  const user = await requireChatPermission()
  const now = new Date()

  const [updatedUser, unreadAgg, unreadThreadsCount] = await Promise.all([
    prisma.user.update({
      where: { id: user.id },
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

interface MatchedGuestSummary {
  id: string
  name: string
}

async function findDeterministicMatchedGuest(
  visitorEmail: string | null,
  visitorPhone: string | null,
): Promise<MatchedGuestSummary | null> {
  const normalizedEmail = visitorEmail?.trim().toLowerCase() || ''
  if (normalizedEmail) {
    const emailMatches = await prisma.guest.findMany({
      where: {
        deletedAt: null,
        email: { equals: normalizedEmail, mode: 'insensitive' },
      },
      take: 2,
      select: { id: true, firstName: true, lastName: true },
    })
    if (emailMatches.length === 1) {
      const g = emailMatches[0]
      return { id: g.id, name: formatFullName(g.firstName, g.lastName) }
    }
    if (emailMatches.length > 1) {
      return null
    }
  }

  const rawPhone = visitorPhone?.trim() || ''
  const normalizedPhone = normalizePhoneForStorage(rawPhone)
  const phoneCandidates = Array.from(
    new Set([normalizedPhone, rawPhone].filter(Boolean)),
  )
  const phoneSuffix = normalizedPhone.length >= 7 ? normalizedPhone.slice(-4) : ''
  if (phoneCandidates.length > 0) {
    const candidates = await prisma.guest.findMany({
      where: {
        deletedAt: null,
        OR: [
          {
            phone:
              phoneCandidates.length === 1
                ? phoneCandidates[0]
                : { in: phoneCandidates },
          },
          ...(phoneSuffix ? [{ phone: { endsWith: phoneSuffix } }] : []),
        ],
      },
      take: 25,
      select: { id: true, firstName: true, lastName: true, phone: true },
    })
    const phoneMatches = candidates.filter((g) =>
      phonesMatch(g.phone, rawPhone),
    )
    if (phoneMatches.length === 1) {
      const g = phoneMatches[0]
      return { id: g.id, name: formatFullName(g.firstName, g.lastName) }
    }
  }

  return null
}

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
  const user = await requireChatPermission()
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

  // Update current staff member's presence before counting online staff, while running inbox queries in parallel
  const [updatedUser, conversations, unreadThreadsCount, unreadAgg] =
    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
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
    ])

  const onlineStaffCount = await getOnlineStaffCountSafe(now)

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
  const normalizedPhoneSet = new Set(
    phones
      .map((p) => normalizePhoneForStorage(p))
      .filter((v) => v.length > 0),
  )
  const allExactPhones = Array.from(new Set([...phones, ...normalizedPhoneSet]))
  const phoneSuffixes = Array.from(
    new Set(
      Array.from(normalizedPhoneSet)
        .filter((p) => p.length >= 7)
        .map((p) => p.slice(-4)),
    ),
  )

  const matchedGuests =
    emails.length > 0 || allExactPhones.length > 0
      ? await prisma.guest.findMany({
          where: {
            deletedAt: null,
            OR: [
              ...(emails.length > 0
                ? emails.map((email) => ({
                    email: { equals: email, mode: 'insensitive' as const },
                  }))
                : []),
              ...(allExactPhones.length > 0
                ? [{ phone: { in: allExactPhones } }]
                : []),
              ...phoneSuffixes.map((suffix) => ({
                phone: { endsWith: suffix },
              })),
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

  const guestByEmail = new Map<string, MatchedGuestSummary | 'AMBIGUOUS'>()
  const guestByPhone = new Map<string, MatchedGuestSummary | 'AMBIGUOUS'>()
  const registerPhoneKey = (key: string, summary: MatchedGuestSummary) => {
    if (!key) return
    const existing = guestByPhone.get(key)
    if (!existing) {
      guestByPhone.set(key, summary)
    } else if (existing === 'AMBIGUOUS' || existing.id !== summary.id) {
      guestByPhone.set(key, 'AMBIGUOUS')
    }
  }
  for (const guest of matchedGuests) {
    const summary: MatchedGuestSummary = {
      id: guest.id,
      name: formatFullName(guest.firstName, guest.lastName),
    }
    if (guest.email) {
      const key = guest.email.trim().toLowerCase()
      const existing = guestByEmail.get(key)
      if (!existing) {
        guestByEmail.set(key, summary)
      } else if (existing === 'AMBIGUOUS' || existing.id !== summary.id) {
        guestByEmail.set(key, 'AMBIGUOUS')
      }
    }
    if (guest.phone) {
      registerPhoneKey(guest.phone.trim(), summary)
      registerPhoneKey(normalizePhoneForStorage(guest.phone), summary)
    }
  }

  return {
    conversations: conversations.map((c): AdminChatConversationSummary => {
      const emailKey = c.visitorEmail?.trim().toLowerCase() || ''
      const phoneKey = c.visitorPhone?.trim() || ''
      const normalizedPhoneKey = phoneKey
        ? normalizePhoneForStorage(phoneKey)
        : ''

      // Deterministic priority: email match first; fall back to phone only when there is no email match; reject ambiguous matches
      const emailMatch = emailKey ? guestByEmail.get(emailKey) : undefined
      let matched: MatchedGuestSummary | null = null
      if (emailMatch === 'AMBIGUOUS') {
        matched = null
      } else if (emailMatch) {
        matched = emailMatch
      } else if (phoneKey) {
        const phoneMatch =
          guestByPhone.get(phoneKey) ??
          (normalizedPhoneKey
            ? guestByPhone.get(normalizedPhoneKey)
            : undefined)
        matched = phoneMatch && phoneMatch !== 'AMBIGUOUS' ? phoneMatch : null
      }

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

export interface GetAdminChatThreadInput {
  conversationId: string
  beforeMessageId?: string
}

export function validateConversationId(
  data: GetAdminChatThreadInput,
): GetAdminChatThreadInput {
  if (!data.conversationId.trim()) {
    throw new Error('Conversation ID is required.')
  }
  return {
    conversationId: data.conversationId.trim(),
    beforeMessageId: data.beforeMessageId?.trim() || undefined,
  }
}

export async function getAdminChatThreadHandler({
  data,
}: {
  data: GetAdminChatThreadInput
}): Promise<AdminChatThreadDetail> {
  const user = await requireChatPermission()
  const { conversationId, beforeMessageId } = validateConversationId(data)
  const now = new Date()

  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: ADMIN_MESSAGE_PAGE_SIZE + 1,
        ...(beforeMessageId
          ? { cursor: { id: beforeMessageId }, skip: 1 }
          : {}),
      },
    },
  })

  if (!conversation) {
    throw new Error('Conversation not found.')
  }

  // Record staff presence non-fatally
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: now },
      select: { id: true },
    })
  } catch {
    // Ignore ancillary presence failure
  }

  // Perform deterministic guest lookup BEFORE acknowledging unread messages so a failed lookup preserves unread state
  const matchedGuest = await findDeterministicMatchedGuest(
    conversation.visitorEmail,
    conversation.visitorPhone,
  )

  const { messages, olderCursor, newestMessage } = toChronologicalPage(
    conversation.messages,
    ADMIN_MESSAGE_PAGE_SIZE,
  )

  let nextUnread = conversation.unreadByStaff
  if (!beforeMessageId && conversation.unreadByStaff > 0) {
    nextUnread = await acknowledgeUnreadThroughMessage({
      conversationId: conversation.id,
      observedLastMessageAt: conversation.lastMessageAt,
      counterField: 'unreadByStaff',
      unreadSenderType: 'VISITOR',
      newestReturnedMessage: newestMessage,
    })
  }

  return {
    conversation: {
      id: conversation.id,
      visitorName: conversation.visitorName,
      visitorEmail: conversation.visitorEmail,
      visitorPhone: conversation.visitorPhone,
      status: conversation.status,
      unreadByStaff: nextUnread,
      lastMessageAt: conversation.lastMessageAt,
      lastMessagePreview: conversation.lastMessagePreview,
      createdAt: conversation.createdAt,
      matchedGuestId: matchedGuest?.id ?? null,
      matchedGuestName: matchedGuest?.name ?? null,
    },
    messages,
    olderCursor,
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
  const user = await requireChatPermission()
  const { conversationId, body } = validateSendAdminChatReply(data)
  const now = new Date()
  const staffName = user.name.trim() || 'Resort Team'
  const preview = buildPreview(body)

  const txResult = await prisma.$transaction(async (tx) => {
    const existing = await tx.chatConversation.findUnique({
      where: { id: conversationId },
    })
    if (!existing) {
      throw new Error('Conversation not found.')
    }

    const visitorIsLikelyOffline =
      now.getTime() - existing.lastVisitorActiveAt.getTime() >=
      VISITOR_OFFLINE_EMAIL_THRESHOLD_MS

    const shouldQueueGuestEmail = Boolean(
      existing.visitorEmail &&
        isSingleMailboxEmail(existing.visitorEmail) &&
        visitorIsLikelyOffline,
    )

    const createdMessage = await tx.chatMessage.create({
      data: {
        conversationId,
        senderType: 'STAFF',
        senderName: staffName,
        senderUserId: user.id,
        body,
        guestEmailPending: shouldQueueGuestEmail,
      },
    })

    // Preserve unreadByStaff on send (do not treat sending a reply as reading concurrent unseen visitor messages)
    await tx.chatConversation.update({
      where: { id: conversationId },
      data: {
        status: 'OPEN',
        unreadByVisitor: { increment: 1 },
        lastMessageAt: now,
        lastMessagePreview: preview,
      },
    })

    return {
      existing,
      createdMessage,
      shouldQueueGuestEmail,
    }
  })

  // Ancillary presence update kept outside transaction so its failure cannot reject a committed reply
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: now },
      select: { id: true },
    })
  } catch {
    // Ignore ancillary presence failure
  }

  if (txResult.shouldQueueGuestEmail && txResult.existing.visitorEmail) {
    void dispatchPendingGuestReplyEmail({
      messageId: txResult.createdMessage.id,
      to: txResult.existing.visitorEmail,
      visitorName: txResult.existing.visitorName,
      staffName,
      replyBody: body,
    })
  }

  return {
    id: txResult.createdMessage.id,
    conversationId: txResult.createdMessage.conversationId,
    senderType: txResult.createdMessage.senderType,
    senderName: txResult.createdMessage.senderName,
    body: txResult.createdMessage.body,
    createdAt: txResult.createdMessage.createdAt,
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
  await requireChatPermission()
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
