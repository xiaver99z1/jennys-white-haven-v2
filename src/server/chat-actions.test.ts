import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import {
  EMAIL_ALERT_IDLE_COOLDOWN_MS,
  VISITOR_OFFLINE_EMAIL_THRESHOLD_MS,
  getAdminChatInboxHandler,
  getAdminChatThreadHandler,
  getPublicChatStateHandler,
  heartbeatAdminPresenceHandler,
  sendAdminChatReplyHandler,
  sendVisitorChatMessageHandler,
  updateAdminChatStatusHandler,
} from './chat-actions'

const {
  mockAuthSession,
  mockSendChatInquiryAlertEmail,
  mockSendChatReplyToGuestEmail,
  mockPrisma,
} = vi.hoisted(() => ({
  mockAuthSession: vi.fn(),
  mockSendChatInquiryAlertEmail: vi.fn(),
  mockSendChatReplyToGuestEmail: vi.fn(),
  mockPrisma: {
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    chatConversation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    chatMessage: {
      create: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    guest: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('#/lib/auth-helpers', () => ({
  authSession: mockAuthSession,
}))

vi.mock('#/lib/email', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    sendChatInquiryAlertEmail: mockSendChatInquiryAlertEmail,
    sendChatReplyToGuestEmail: mockSendChatReplyToGuestEmail,
  }
})

vi.mock('#/lib/prisma', () => ({
  prisma: mockPrisma,
}))

describe('chat-actions', () => {
  const validToken = 'a'.repeat(64)

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SMTP_USER = 'resort@jennyswhitehaven.com'
    mockPrisma.$transaction.mockImplementation(
      async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma),
    )
    mockPrisma.$executeRaw.mockResolvedValue(1)
    mockAuthSession.mockResolvedValue({
      user: { id: 'staff-1', name: 'Jenny Host', role: 'OWNER' },
    })
    mockPrisma.user.count.mockResolvedValue(1)
    mockPrisma.user.findMany.mockResolvedValue([
      { email: 'owner@jennyswhitehaven.com', role: 'OWNER' },
      { email: 'frontdesk@jennyswhitehaven.com', role: 'RECEPTIONIST' },
    ])
    mockPrisma.user.update.mockResolvedValue({ chatAvailable: true })
    mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' })
    mockPrisma.chatConversation.count.mockResolvedValue(0)
    mockPrisma.chatConversation.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.chatMessage.count.mockResolvedValue(0)
    mockPrisma.chatMessage.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.chatConversation.aggregate.mockResolvedValue({
      _sum: { unreadByStaff: 0 },
    })
    mockSendChatInquiryAlertEmail.mockResolvedValue({ messageId: '<alert>' })
    mockSendChatReplyToGuestEmail.mockResolvedValue({ messageId: '<reply>' })
  })

  it('rejects non-staff sessions on all admin chat handlers', async () => {
    mockAuthSession.mockResolvedValue({
      user: { id: 'user-self-reg', name: 'Visitor', role: 'user' },
    })

    await expect(heartbeatAdminPresenceHandler({ data: {} })).rejects.toThrow(
      'Unauthorized: Insufficient permissions.',
    )
    await expect(getAdminChatInboxHandler({ data: {} })).rejects.toThrow(
      'Unauthorized: Insufficient permissions.',
    )
    await expect(
      getAdminChatThreadHandler({ data: { conversationId: 'conv-1' } }),
    ).rejects.toThrow('Unauthorized: Insufficient permissions.')
    await expect(
      sendAdminChatReplyHandler({
        data: { conversationId: 'conv-1', body: 'Hi' },
      }),
    ).rejects.toThrow('Unauthorized: Insufficient permissions.')
    await expect(
      updateAdminChatStatusHandler({
        data: { conversationId: 'conv-1', status: 'RESOLVED' },
      }),
    ).rejects.toThrow('Unauthorized: Insufficient permissions.')
  })

  it('returns chronological newest messages, skips presence refresh on closed background polls, and acknowledges read conditionally', async () => {
    const t1 = new Date('2026-11-27T05:00:00.000Z')
    const t2 = new Date('2026-11-27T05:01:00.000Z')

    // Closed background poll: does NOT update lastVisitorActiveAt
    mockPrisma.chatConversation.findUnique.mockResolvedValueOnce({
      id: 'conv-1',
      visitorName: 'Maria Santos',
      visitorEmail: 'maria@example.com',
      visitorPhone: null,
      status: 'OPEN',
      unreadByVisitor: 1,
      lastMessageAt: t2,
      createdAt: t1,
      // Query fetches descending (newest first), handler reverses to chronological
      messages: [
        {
          id: 'm2',
          conversationId: 'conv-1',
          senderType: 'STAFF',
          senderName: 'Jenny Host',
          body: 'Second',
          createdAt: t2,
        },
        {
          id: 'm1',
          conversationId: 'conv-1',
          senderType: 'VISITOR',
          senderName: 'Maria Santos',
          body: 'First',
          createdAt: t1,
        },
      ],
    })

    const bgRes = await getPublicChatStateHandler({
      data: { visitorToken: validToken, markRead: false, isWidgetOpen: false },
    })

    expect(bgRes.messages.map((m) => m.body)).toEqual(['First', 'Second'])
    expect(bgRes.conversation?.unreadByVisitor).toBe(1)
    expect(mockPrisma.chatConversation.update).not.toHaveBeenCalled()
    expect(mockPrisma.chatConversation.updateMany).not.toHaveBeenCalled()

    // Open widget with markRead=true: conditionally clears unread and refreshes lastVisitorActiveAt
    mockPrisma.chatConversation.findUnique.mockResolvedValueOnce({
      id: 'conv-1',
      visitorName: 'Maria Santos',
      visitorEmail: 'maria@example.com',
      visitorPhone: null,
      status: 'OPEN',
      unreadByVisitor: 1,
      lastMessageAt: t2,
      createdAt: t1,
      messages: [
        {
          id: 'm2',
          conversationId: 'conv-1',
          senderType: 'STAFF',
          senderName: 'Jenny Host',
          body: 'Second',
          createdAt: t2,
        },
      ],
    })

    const openRes = await getPublicChatStateHandler({
      data: { visitorToken: validToken, markRead: true, isWidgetOpen: true },
    })

    expect(openRes.conversation?.unreadByVisitor).toBe(0)
    expect(mockPrisma.chatConversation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conv-1', lastMessageAt: t2 },
      }),
    )
  })

  it('validates single-mailbox email, commits conversation + message in transaction, and dispatches alerts', async () => {
    await expect(
      sendVisitorChatMessageHandler({
        data: { message: 'Hello', honeypot: 'http://spam.bot' },
      }),
    ).rejects.toThrow('Spam submission blocked.')

    mockPrisma.chatConversation.findUnique.mockResolvedValue(null)

    await expect(
      sendVisitorChatMessageHandler({
        data: {
          name: 'Maria',
          email: 'alice,bob@example.com',
          message: 'Is Deluxe open?',
        },
      }),
    ).rejects.toThrow(/valid single email address/i)

    const now = new Date()
    mockPrisma.chatConversation.create.mockResolvedValueOnce({
      id: 'conv-new',
      visitorName: 'Maria Santos',
      visitorEmail: 'maria@example.com',
      visitorPhone: '+63 917 000 0000',
      status: 'OPEN',
      lastAppAlertSentAt: null,
      lastEmailAlertSentAt: null,
      pendingEmailAlertMessageId: null,
    })
    mockPrisma.chatMessage.create.mockResolvedValueOnce({
      id: 'msg-1',
      conversationId: 'conv-new',
      senderType: 'VISITOR',
      senderName: 'Maria Santos',
      body: 'Is Deluxe open this weekend?',
      createdAt: now,
    })
    mockPrisma.chatConversation.update.mockResolvedValueOnce({
      id: 'conv-new',
      visitorName: 'Maria Santos',
      visitorEmail: 'maria@example.com',
      visitorPhone: '+63 917 000 0000',
      status: 'OPEN',
      unreadByVisitor: 1,
      lastMessageAt: now,
      createdAt: now,
    })

    const res = await sendVisitorChatMessageHandler({
      data: {
        name: 'Maria Santos',
        email: 'maria@example.com',
        phone: '+63 917 000 0000',
        message: 'Is Deluxe open this weekend?',
      },
    })

    expect(res.visitorToken).toMatch(/^[a-f0-9]{64}$/)
    // Preserves unreadByVisitor instead of resetting it on visitor send
    expect(res.conversation.unreadByVisitor).toBe(1)
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'CHAT_INQUIRY',
          title: 'New Chat Inquiry: Maria Santos',
          href: '/admin/chat',
        }),
      }),
    )

    await waitFor(() => {
      expect(mockSendChatInquiryAlertEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipients: [
            'resort@jennyswhitehaven.com',
            'owner@jennyswhitehaven.com',
          ],
          conversationId: 'conv-new',
        }),
      )
    })
  })

  it('throttles duplicate alerts when atomic claims report 0 rows and re-alerts after cooldown', async () => {
    const recentAlert = new Date(Date.now() - 2 * 60 * 1000)
    mockPrisma.chatConversation.findUnique.mockResolvedValueOnce({
      id: 'conv-1',
      visitorName: 'Maria Santos',
      visitorEmail: 'maria@example.com',
      visitorPhone: null,
      status: 'OPEN',
      lastAppAlertSentAt: recentAlert,
      lastEmailAlertSentAt: recentAlert,
      pendingEmailAlertMessageId: null,
    })
    mockPrisma.chatMessage.create.mockResolvedValueOnce({
      id: 'msg-2',
      conversationId: 'conv-1',
      senderType: 'VISITOR',
      senderName: 'Maria Santos',
      body: 'Follow-up within 2 minutes',
      createdAt: new Date(),
    })
    mockPrisma.chatConversation.update.mockResolvedValueOnce({
      id: 'conv-1',
      visitorName: 'Maria Santos',
      visitorEmail: 'maria@example.com',
      visitorPhone: null,
      status: 'OPEN',
      unreadByVisitor: 0,
      lastMessageAt: new Date(),
      createdAt: new Date(),
    })
    // Atomic claims return count: 0 when within cooldown
    mockPrisma.chatConversation.updateMany.mockResolvedValue({ count: 0 })

    await sendVisitorChatMessageHandler({
      data: {
        visitorToken: validToken,
        message: 'Follow-up within 2 minutes',
      },
    })

    expect(mockPrisma.notification.create).not.toHaveBeenCalled()
    expect(mockSendChatInquiryAlertEmail).not.toHaveBeenCalled()

    // Simulate >30m idle -> atomic claims return count: 1
    const oldAlert = new Date(Date.now() - EMAIL_ALERT_IDLE_COOLDOWN_MS - 5000)
    mockPrisma.chatConversation.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.chatConversation.findUnique.mockResolvedValueOnce({
      id: 'conv-1',
      visitorName: 'Maria Santos',
      visitorEmail: 'maria@example.com',
      visitorPhone: null,
      status: 'OPEN',
      lastAppAlertSentAt: oldAlert,
      lastEmailAlertSentAt: oldAlert,
      pendingEmailAlertMessageId: null,
    })
    mockPrisma.chatMessage.create.mockResolvedValueOnce({
      id: 'msg-3',
      conversationId: 'conv-1',
      senderType: 'VISITOR',
      senderName: 'Maria Santos',
      body: 'Checking back in!',
      createdAt: new Date(),
    })
    mockPrisma.chatConversation.update.mockResolvedValueOnce({
      id: 'conv-1',
      visitorName: 'Maria Santos',
      visitorEmail: 'maria@example.com',
      visitorPhone: null,
      status: 'OPEN',
      unreadByVisitor: 0,
      lastMessageAt: new Date(),
      createdAt: new Date(),
    })

    await sendVisitorChatMessageHandler({
      data: { visitorToken: validToken, message: 'Checking back in!' },
    })

    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(mockSendChatInquiryAlertEmail).toHaveBeenCalledTimes(1)
    })
  })

  it('verifies heartbeat availability=false, deterministic guest matching, and background guest reply email', async () => {
    mockPrisma.user.update.mockResolvedValueOnce({ chatAvailable: false })
    mockPrisma.chatConversation.count.mockResolvedValueOnce(2)
    mockPrisma.chatConversation.aggregate.mockResolvedValueOnce({
      _sum: { unreadByStaff: 4 },
    })

    const hb = await heartbeatAdminPresenceHandler({
      data: { setAvailable: false },
    })
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'staff-1' },
        data: expect.objectContaining({ chatAvailable: false }),
      }),
    )
    expect(hb).toEqual({
      chatAvailable: false,
      unreadThreadsCount: 2,
      unreadMessagesCount: 4,
    })

    const now = new Date()
    mockPrisma.chatConversation.findMany.mockResolvedValueOnce([
      {
        id: 'conv-1',
        visitorName: 'Maria Santos',
        visitorEmail: 'maria@example.com',
        visitorPhone: '0918',
        status: 'OPEN',
        unreadByStaff: 1,
        lastMessageAt: now,
        lastMessagePreview: 'Hi!',
        createdAt: now,
      },
    ])
    mockPrisma.guest.findMany.mockResolvedValueOnce([
      {
        id: 'guest-email-match',
        firstName: 'Maria',
        lastName: 'Santos',
        email: 'maria@example.com',
        phone: '0917',
      },
      {
        id: 'guest-phone-match',
        firstName: 'Other',
        lastName: 'Guest',
        email: 'other@example.com',
        phone: '0918',
      },
    ])

    const inbox = await getAdminChatInboxHandler({ data: { status: 'OPEN' } })
    expect(inbox.conversations[0].matchedGuestId).toBe('guest-email-match')

    // Thread lookup uses the same deterministic email-first rule before acknowledging unread
    mockPrisma.chatConversation.findUnique.mockResolvedValueOnce({
      id: 'conv-1',
      visitorName: 'Maria Santos',
      visitorEmail: 'maria@example.com',
      visitorPhone: '0918',
      status: 'OPEN',
      unreadByStaff: 1,
      lastMessageAt: now,
      lastMessagePreview: 'Hi!',
      createdAt: now,
      messages: [],
    })
    mockPrisma.guest.findMany.mockResolvedValueOnce([
      {
        id: 'guest-email-match',
        firstName: 'Maria',
        lastName: 'Santos',
      },
    ])

    const thread = await getAdminChatThreadHandler({
      data: { conversationId: 'conv-1' },
    })
    expect(thread.conversation.matchedGuestId).toBe('guest-email-match')
    expect(thread.conversation.unreadByStaff).toBe(0)

    // Admin reply queues guestEmailPending and dispatches email asynchronously
    mockPrisma.chatConversation.findUnique.mockResolvedValueOnce({
      id: 'conv-1',
      visitorName: 'Maria Santos',
      visitorEmail: 'maria@example.com',
      lastVisitorActiveAt: new Date(
        Date.now() - VISITOR_OFFLINE_EMAIL_THRESHOLD_MS - 10000,
      ),
    })
    mockPrisma.chatMessage.create.mockResolvedValueOnce({
      id: 'reply-1',
      conversationId: 'conv-1',
      senderType: 'STAFF',
      senderName: 'Jenny Host',
      body: 'Yes, Room 101 is available!',
      createdAt: now,
    })
    mockPrisma.chatConversation.update.mockResolvedValueOnce({})

    const reply = await sendAdminChatReplyHandler({
      data: { conversationId: 'conv-1', body: 'Yes, Room 101 is available!' },
    })
    expect(reply.senderType).toBe('STAFF')

    await waitFor(() => {
      expect(mockSendChatReplyToGuestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'maria@example.com',
          staffName: 'Jenny Host',
        }),
      )
    })

    mockPrisma.chatConversation.update.mockResolvedValueOnce({})
    const statusRes = await updateAdminChatStatusHandler({
      data: { conversationId: 'conv-1', status: 'RESOLVED' },
    })
    expect(statusRes).toEqual({ success: true, status: 'RESOLVED' })
  })
})
