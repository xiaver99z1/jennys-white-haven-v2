import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getUserActivityLogs,
  fetchUserActivityLogsHandler,
  validateActivityLogsData,
} from './activity-actions'
import { prisma } from '#/lib/prisma'

vi.mock('#/lib/prisma', () => ({
  prisma: {
    activityLog: {
      findMany: vi.fn(),
    },
  },
}))

describe('activity-actions server functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('successfully fetches activity logs via handler', async () => {
    const mockLogs = [
      {
        id: 'log-1',
        userId: 'user-123',
        action: 'LOGIN',
        description: 'User logged in',
        createdAt: new Date(),
      },
    ]

    vi.mocked(prisma.activityLog.findMany).mockResolvedValueOnce(
      mockLogs as any,
    )

    const result = await fetchUserActivityLogsHandler({
      data: { userId: 'user-123' },
    })

    expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    expect(result).toEqual({ success: true, logs: mockLogs })
  })

  it('validates input data correctly', () => {
    const input = { userId: 'user-123' }
    expect(validateActivityLogsData(input)).toEqual(input)
  })

  it('handles database errors gracefully and throws an error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(prisma.activityLog.findMany).mockRejectedValueOnce(
      new Error('Database connection failed'),
    )

    await expect(
      fetchUserActivityLogsHandler({ data: { userId: 'user-123' } }),
    ).rejects.toThrow('Failed to fetch activity logs.')

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error fetching activity logs:',
      expect.any(Error),
    )

    consoleSpy.mockRestore()
  })
})
