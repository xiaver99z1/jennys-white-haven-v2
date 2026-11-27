import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AdminChatInbox } from './AdminChatInbox'
import type { AdminChatInboxResponse } from '#/types'

const {
  mockGetAdminChatInbox,
  mockGetAdminChatThread,
  mockHeartbeatAdminPresence,
  mockSendAdminChatReply,
  mockUpdateAdminChatStatus,
} = vi.hoisted(() => ({
  mockGetAdminChatInbox: vi.fn(),
  mockGetAdminChatThread: vi.fn(),
  mockHeartbeatAdminPresence: vi.fn(),
  mockSendAdminChatReply: vi.fn(),
  mockUpdateAdminChatStatus: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    className,
  }: {
    to: string
    children: ReactNode
    className?: string
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('#/server/chat-actions', () => ({
  getAdminChatInbox: mockGetAdminChatInbox,
  getAdminChatThread: mockGetAdminChatThread,
  heartbeatAdminPresence: mockHeartbeatAdminPresence,
  sendAdminChatReply: mockSendAdminChatReply,
  updateAdminChatStatus: mockUpdateAdminChatStatus,
}))

describe('AdminChatInbox', () => {
  const sampleConv = {
    id: 'conv-1',
    visitorName: 'Maria Santos',
    visitorEmail: 'maria@example.com',
    visitorPhone: '+63 917 123 4567',
    status: 'OPEN' as const,
    unreadByStaff: 1,
    lastMessageAt: '2026-11-27T06:00:00.000Z',
    lastMessagePreview: 'Do you offer port pickup?',
    createdAt: '2026-11-27T05:55:00.000Z',
    matchedGuestId: 'guest-1',
    matchedGuestName: 'Maria Santos',
  }

  const initialData: AdminChatInboxResponse = {
    conversations: [sampleConv],
    unreadThreadsCount: 1,
    unreadMessagesCount: 1,
    chatAvailable: true,
    onlineStaffCount: 1,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAdminChatInbox.mockResolvedValue(initialData)
    mockGetAdminChatThread.mockResolvedValue({
      conversation: { ...sampleConv, unreadByStaff: 0 },
      messages: [
        {
          id: 'm1',
          conversationId: 'conv-1',
          senderType: 'VISITOR',
          senderName: 'Maria Santos',
          body: 'Do you offer port pickup?',
          createdAt: '2026-11-27T06:00:00.000Z',
        },
      ],
    })
  })

  it('loads selected conversation, toggles availability status, sends quick reply, and marks resolved', async () => {
    mockHeartbeatAdminPresence.mockResolvedValueOnce({
      chatAvailable: false,
      unreadThreadsCount: 0,
      unreadMessagesCount: 0,
    })
    mockSendAdminChatReply.mockResolvedValueOnce({
      id: 'm2',
      conversationId: 'conv-1',
      senderType: 'STAFF',
      senderName: 'Jenny',
      body: 'Yes, we can help arrange port pickup from Consuelo or Poro port!',
      createdAt: '2026-11-27T06:02:00.000Z',
    })
    mockUpdateAdminChatStatus.mockResolvedValueOnce({
      success: true,
      status: 'RESOLVED',
    })

    render(<AdminChatInbox initialData={initialData} />)

    await waitFor(() => {
      expect(
        screen.getAllByText('Do you offer port pickup?').length,
      ).toBeGreaterThan(0)
    })
    expect(screen.getByText(/Guest Profile: Maria Santos/i)).toBeInTheDocument()

    // Toggle Online -> Away
    fireEvent.click(
      screen.getByRole('button', { name: /Status: Online for Live Chat/i }),
    )
    await waitFor(() => {
      expect(mockHeartbeatAdminPresence).toHaveBeenCalledWith({
        data: { setAvailable: false },
      })
    })

    // Select a quick-reply chip and send
    fireEvent.click(
      screen.getByRole('button', { name: /Yes, we can help arrange port/i }),
    )
    fireEvent.click(screen.getByRole('button', { name: /Send Reply/i }))

    await waitFor(() => {
      expect(mockSendAdminChatReply).toHaveBeenCalledWith({
        data: {
          conversationId: 'conv-1',
          body: 'Yes, we can help arrange port pickup from Consuelo or Poro port!',
        },
      })
      expect(
        screen.getByText(
          'Yes, we can help arrange port pickup from Consuelo or Poro port!',
        ),
      ).toBeInTheDocument()
    })

    // Mark Resolved
    fireEvent.click(screen.getByRole('button', { name: /Mark Resolved/i }))
    await waitFor(() => {
      expect(mockUpdateAdminChatStatus).toHaveBeenCalledWith({
        data: { conversationId: 'conv-1', status: 'RESOLVED' },
      })
      expect(
        screen.getByRole('button', { name: /Reopen Thread/i }),
      ).toBeInTheDocument()
    })
  })
})
