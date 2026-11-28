import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requirePermission } from './require-permission'
import { authSession } from '#/lib/auth-helpers'

vi.mock('#/lib/auth-helpers', () => ({
  authSession: vi.fn(),
}))

describe('requirePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the authenticated user when role grants the requested permission', async () => {
    const user = { id: 'u1', email: 'owner@resort.com', role: 'owner' }
    vi.mocked(authSession).mockResolvedValue({
      user,
      session: { ipAddress: '127.0.0.1', userAgent: 'Vitest' },
    } as any)

    await expect(requirePermission('manage:cms')).resolves.toEqual(user)
  })

  it('throws Unauthorized when user lacks the requested permission', async () => {
    vi.mocked(authSession).mockResolvedValue({
      user: { id: 'u2', email: 'desk@resort.com', role: 'receptionist' },
      session: { ipAddress: '127.0.0.1', userAgent: 'Vitest' },
    } as any)

    await expect(requirePermission('delete:rooms')).rejects.toThrow(
      'Unauthorized: Insufficient permissions.',
    )
  })
})
