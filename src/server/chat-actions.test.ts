import { describe, it, expect, vi, beforeEach } from 'vitest'
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
  mockCreateNotification,
  mockSendChatInquiryAlertEmail,
  mockSendChatReplyToGuestEmail,
  mockPrisma,
} = vi.hoisted(() => ({
  mockAuthSession: vi.fn(),
  mockCreateNotification: vi.fn(),
  mockSendChatInquiryAlertEmail: vi.fn(),
  mockSendChatReplyToGuestEmail: vi.fn(),
  mockPrisma: {
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    chatConversation: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    chatMessage: {
      create: vi.fn(),
      count: vi.fn(),
    },
    guest: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('#/lib/auth-helpers', () => ({
  authSession: mockAuthSession,
}))

vi.mock('#/server/notification-actions', () => ({
  createNotification: mockCreateNotification,
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
    mockAuthSession.mockResolvedValue({
      user: { id: 'staff-1', name: 'Jenny Host', role: 'OWNER' },
    })
    mockPrisma.user.count.mockResolvedValue(1)
    mockPrisma.user.findMany.mockResolvedValue([
      { email: 'owner@jennyswhitehaven.com', role: 'OWNER' },
      { email: 'frontdesk@jennyswhitehaven.com', role: 'RECEPTIONIST' },
    ])
    mockPrisma.user.update.mockResolvedValue({ chatAvailable: true })
    mockPrisma.chatConversation.count.mockResolvedValue(0)
    mockPrisma.chatMessage.count.mockResolvedValue(0)
    mockPrisma.chatConversation.aggregate.mockResolvedValue({
      _sum: { unreadByStaff: 0 },
    })
  })

  it('returns online status and empty state when visitor token is absent or invalid', async () => {
    const res = await getPublicChatStateHandler({ data: {} })
    expect(res).toEqual({
      staffOnline: true,
      conversation: null,
      messages: [],
    })
    expect(mockPrisma.chatConversation.findFirst).not.toHaveBeenCalled()
  })

  it('loads existing visitor conversation and marks unreadByVisitor=0 when markRead=true', async () => {
    const now = new Date()
    mockPrisma.chatConversation.findFirst.mockResolvedValueOnce({
      id: 'conv-1',
      visitorName: 'Maria Santos',
      visitorEmail: 'maria@example.com',
      visitorPhone: null,
      status: 'OPEN',
      unreadByVisitor: 2,
      lastMessageAt: now,
      createdAt: now,
      messages: [
        {
          id: 'm1',
          conversationId: 'conv-1',
          senderType: 'STAFF',
          senderName: 'Jenny Host',
          body: 'Welcome!',
          createdAt: now,
        },
      ],
    })
    mockPrisma.chatConversation.update.mockResolvedValueOnce({})

    const res = await getPublicChatStateHandler({
      data: { visitorToken: validToken, markRead: true },
    })

    expect(res.staffOnline).toBe(true)
    expect(res.conversation?.unreadByVisitor).toBe(0)
    expect(res.messages).toHaveLength(1)
    expect(mockPrisma.chatConversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conv-1' },
        data: expect.objectContaining({ unreadByVisitor: 0 }),
      }),
    )
  })

  it('validates visitor onboarding, creates new conversation, and sends app + email alerts to SMTP_USER and Owner/Manager', async () => {
    await expect(
      sendVisitorChatMessageHandler({
        data: { message: 'Hello', honeypot: 'http://spam.bot' },
      }),
    ).rejects.toThrow('Spam submission blocked.')

    mockPrisma.chatConversation.findFirst.mockResolvedValue(null)

    await expect(
      sendVisitorChatMessageHandler({
        data: { name: 'Maria', message: 'Is Deluxe open?' },
      }),
    ).rejects.toThrow(/provide an email address or phone number/i)

    const now = new Date()
    mockPrisma.chatConversation.create.mockResolvedValueOnce({
      id: 'conv-new',
      visitorName: 'Maria Santos',
      visitorEmail: 'maria@example.com',
      visitorPhone: '+63 917 000 0000',
      status: 'OPEN',
      lastAlertSentAt: null,
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
      unreadByVisitor: 0,
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
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CHAT_INQUIRY',
        title: 'New Chat Inquiry: Maria Santos',
        href: '/admin/chat',
      }),
    )
    // Sends to SMTP_USER + OWNER, excluding RECEPTIONIST per A4 preference
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

  it('throttles duplicate alerts on rapid follow-up messages and re-alerts after 30m idle', async () => {
    const recentAlert = new Date(Date.now() - 2 * 60 * 1000)
    mockPrisma.chatConversation.findFirst.mockResolvedValueOnce({
      id: 'conv-1',
      visitorName: 'Maria Santos',
      visitorEmail: 'maria@example.com',
      visitorPhone: null,
      status: 'OPEN',
      lastAlertSentAt: recentAlert,
    })
    mockPrisma.chatMessage.create.mockResolvedValueOnce({
      id: 'msg-2',
      conversationId: 'conv-1',
      senderType: 'VISITOR',
      senderName: 'Maria Santos',
      body: 'Also asking about airport/port pickup',
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
      data: {
        visitorToken: validToken,
        message: 'Also asking about airport/port pickup',
      },
    })

    expect(mockCreateNotification).not.toHaveBeenCalled()
    expect(mockSendChatInquiryAlertEmail).not.toHaveBeenCalled()

    // Now simulate >30m idle -> should re-notify
    const oldAlert = new Date(Date.now() - EMAIL_ALERT_IDLE_COOLDOWN_MS - 5000)
    mockPrisma.chatConversation.findFirst.mockResolvedValueOnce({
      id: 'conv-1',
      visitorName: 'Maria Santos',
      visitorEmail: 'maria@example.com',
      visitorPhone: null,
      status: 'OPEN',
      lastAlertSentAt: oldAlert,
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

    expect(mockCreateNotification).toHaveBeenCalledTimes(1)
    expect(mockSendChatInquiryAlertEmail).toHaveBeenCalledTimes(1)
  })

  it('handles admin presence heartbeat, inbox guest matching, thread load, offline reply email, and status updates', async () => {
    mockPrisma.chatConversation.count.mockResolvedValueOnce(2)
    mockPrisma.chatConversation.aggregate.mockResolvedValueOnce({
      _sum: { unreadByStaff: 4 },
    })

    const hb = await heartbeatAdminPresenceHandler({
      data: { setAvailable: false },
    })
    expect(hb).toEqual({
      chatAvailable: true,
      unreadThreadsCount: 2,
      unreadMessagesCount: 4,
    })

    const now = new Date()
    mockPrisma.chatConversation.findMany.mockResolvedValueOnce([
      {
        id: 'conv-1',
        visitorName: 'Maria Santos',
        visitorEmail: 'maria@example.com',
        visitorPhone: null,
        status: 'OPEN',
        unreadByStaff: 1,
        lastMessageAt: now,
        lastMessagePreview: 'Hi!',
        createdAt: now,
      },
    ])
    mockPrisma.guest.findMany.mockResolvedValueOnce([
      {
        id: 'guest-99',
        firstName: 'Maria',
        lastName: 'Santos',
        email: 'maria@example.com',
        phone: '0917',
      },
    ])

    const inbox = await getAdminChatInboxHandler({ data: { status: 'OPEN' } })
    expect(inbox.conversations[0].matchedGuestId).toBe('guest-99')
    expect(inbox.conversations[0].matchedGuestName).toBe('Maria Santos')

    mockPrisma.chatConversation.findUnique.mockResolvedValueOnce({
      id: 'conv-1',
      visitorName: 'Maria Santos',
      visitorEmail: 'maria@example.com',
      visitorPhone: null,
      status: 'OPEN',
      unreadByStaff: 1,
      lastMessageAt: now,
      lastMessagePreview: 'Hi!',
      createdAt: now,
      messages: [],
    })
    mockPrisma.chatConversation.update.mockResolvedValueOnce({})
    mockPrisma.guest.findFirst.mockResolvedValueOnce({
      id: 'guest-99',
      firstName: 'Maria',
      lastName: 'Santos',
    })

    const thread = await getAdminChatThreadHandler({
      data: { conversationId: 'conv-1' },
    })
    expect(thread.conversation.unreadByStaff).toBe(0)

    // Admin reply when visitor has been offline >2m triggers email reply to guest
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
    expect(mockSendChatReplyToGuestEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'maria@example.com',
        staffName: 'Jenny Host',
      }),
    )

    mockPrisma.chatConversation.update.mockResolvedValueOnce({})
    const statusRes = await updateAdminChatStatusHandler({
      data: { conversationId: 'conv-1', status: 'RESOLVED' },
    })
    expect(statusRes).toEqual({ success: true, status: 'RESOLVED' })
  })
})
