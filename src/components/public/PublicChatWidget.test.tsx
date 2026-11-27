import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PublicChatWidget, VISITOR_CHAT_TOKEN_KEY } from './PublicChatWidget'

const { mockGetPublicChatState, mockSendVisitorChatMessage } = vi.hoisted(
  () => ({
    mockGetPublicChatState: vi.fn(),
    mockSendVisitorChatMessage: vi.fn(),
  }),
)

vi.mock('#/server/chat-actions', () => ({
  getPublicChatState: mockGetPublicChatState,
  sendVisitorChatMessage: mockSendVisitorChatMessage,
}))

describe('PublicChatWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    mockGetPublicChatState.mockResolvedValue({
      staffOnline: true,
      conversation: null,
      messages: [],
    })
  })

  it('opens chat dialog, shows online indicator, starts a conversation, and sends a follow-up message', async () => {
    const now = new Date().toISOString()
    const issuedToken = 'b'.repeat(64)

    mockSendVisitorChatMessage
      .mockResolvedValueOnce({
        visitorToken: issuedToken,
        staffOnline: true,
        conversation: {
          id: 'conv-1',
          visitorName: 'Maria Santos',
          visitorEmail: 'maria@example.com',
          visitorPhone: null,
          status: 'OPEN',
          unreadByVisitor: 0,
          lastMessageAt: now,
          createdAt: now,
        },
        message: {
          id: 'msg-1',
          conversationId: 'conv-1',
          senderType: 'VISITOR',
          senderName: 'Maria Santos',
          body: 'Whole House rate & capacity for Dec 28?',
          createdAt: now,
        },
      })
      .mockResolvedValueOnce({
        visitorToken: issuedToken,
        staffOnline: true,
        conversation: {
          id: 'conv-1',
          visitorName: 'Maria Santos',
          visitorEmail: 'maria@example.com',
          visitorPhone: null,
          status: 'OPEN',
          unreadByVisitor: 0,
          lastMessageAt: now,
          createdAt: now,
        },
        message: {
          id: 'msg-2',
          conversationId: 'conv-1',
          senderType: 'VISITOR',
          senderName: 'Maria Santos',
          body: 'We are 8 adults.',
          createdAt: now,
        },
      })

    render(<PublicChatWidget />)

    fireEvent.click(screen.getByRole('button', { name: /Open chat support/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/We're Online · Replies in a few minutes/i),
      ).toBeInTheDocument()
    })

    // Click a quick question chip, fill name & email, and submit
    fireEvent.click(
      screen.getByRole('button', { name: /Whole House rate & capacity/i }),
    )
    fireEvent.change(screen.getByLabelText(/Your Name/i), {
      target: { value: 'Maria Santos' },
    })
    fireEvent.change(screen.getByLabelText(/^Email$/i), {
      target: { value: 'maria@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^Message \*/i), {
      target: { value: 'Whole House rate & capacity for Dec 28?' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Start Live Chat/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Whole House rate & capacity for Dec 28?'),
      ).toBeInTheDocument()
    })
    expect(window.localStorage.getItem(VISITOR_CHAT_TOKEN_KEY)).toBe(
      issuedToken,
    )

    // Send a follow-up message in the live thread
    const replyInput = screen.getByLabelText(/Write a message/i)
    fireEvent.change(replyInput, { target: { value: 'We are 8 adults.' } })
    fireEvent.click(screen.getByRole('button', { name: /Send message/i }))

    await waitFor(() => {
      expect(screen.getByText('We are 8 adults.')).toBeInTheDocument()
    })
  })

  it('displays away status and unread badge when returning visitor has unread staff reply', async () => {
    const now = new Date().toISOString()
    window.localStorage.setItem(VISITOR_CHAT_TOKEN_KEY, 'c'.repeat(64))
    mockGetPublicChatState.mockResolvedValueOnce({
      staffOnline: false,
      conversation: {
        id: 'conv-2',
        visitorName: 'Juan Cruz',
        visitorEmail: 'juan@example.com',
        visitorPhone: null,
        status: 'OPEN',
        unreadByVisitor: 2,
        lastMessageAt: now,
        createdAt: now,
      },
      messages: [
        {
          id: 'm1',
          conversationId: 'conv-2',
          senderType: 'STAFF',
          senderName: 'Jenny',
          body: 'Hello Juan! Yes, those dates are open.',
          createdAt: now,
        },
      ],
    })

    render(<PublicChatWidget enableInitialSyncInTest />)

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    mockGetPublicChatState.mockResolvedValueOnce({
      staffOnline: false,
      conversation: {
        id: 'conv-2',
        visitorName: 'Juan Cruz',
        visitorEmail: 'juan@example.com',
        visitorPhone: null,
        status: 'OPEN',
        unreadByVisitor: 0,
        lastMessageAt: now,
        createdAt: now,
      },
      messages: [
        {
          id: 'm1',
          conversationId: 'conv-2',
          senderType: 'STAFF',
          senderName: 'Jenny',
          body: 'Hello Juan! Yes, those dates are open.',
          createdAt: now,
        },
      ],
    })

    fireEvent.click(screen.getByRole('button', { name: /Open chat support/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Hello Juan! Yes, those dates are open.'),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/Currently Away · Leave a message anytime/i),
      ).toBeInTheDocument()
    })
  })
})
