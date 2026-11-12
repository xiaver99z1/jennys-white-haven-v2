import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ProfileSettings } from './ProfileSettings'
import { authClient } from '#/lib/auth-client'
import { logProfileActivity } from '#/server/profile-actions'

vi.mock('#/lib/auth-client', () => ({
  authClient: {
    getSession: vi.fn(),
    updateUser: vi.fn(),
    changePassword: vi.fn(),
  },
}))

vi.mock('#/server/profile-actions', () => ({
  logProfileActivity: vi.fn(),
}))

describe('ProfileSettings', () => {
  const mockUserSession = {
    data: {
      user: {
        id: 'user-1',
        name: 'Jenny Admin',
        email: 'jenny@resort.com',
        role: 'OWNER',
        image: 'https://example.com/avatar.jpg',
      },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authClient.getSession).mockResolvedValue(mockUserSession as any)
    vi.mocked(logProfileActivity).mockResolvedValue(undefined as any)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads session with user data and renders avatar image and role badge', async () => {
    render(<ProfileSettings />)

    await waitFor(() => {
      expect(screen.getByText('Jenny Admin')).toBeInTheDocument()
      expect(screen.getByText('OWNER')).toBeInTheDocument()
      expect(screen.getByAltText('Avatar')).toHaveAttribute(
        'src',
        'https://example.com/avatar.jpg',
      )
    })
  })

  it('handles session with non-empty name and null image, empty name/image, and null session data gracefully', async () => {
    vi.mocked(authClient.getSession).mockResolvedValueOnce({
      data: {
        user: {
          id: 'u1',
          name: 'Jenny',
          email: 'jenny@resort.com',
          image: null,
        },
      },
    } as any)

    const { unmount: unmountNamed } = render(<ProfileSettings />)

    await waitFor(() => {
      expect(screen.getByText('Jenny')).toBeInTheDocument()
      expect(screen.getByText('J')).toBeInTheDocument()
    })
    unmountNamed()

    vi.mocked(authClient.getSession).mockResolvedValueOnce({
      data: {
        user: { id: 'u2', name: '', email: 'no-name@resort.com', image: null },
      },
    } as any)

    const { unmount } = render(<ProfileSettings />)

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument()
      expect(screen.getByText('A')).toBeInTheDocument()
    })
    unmount()

    vi.mocked(authClient.getSession).mockResolvedValueOnce({
      data: null,
    } as any)
    render(<ProfileSettings />)
    expect(screen.getByText('Account Settings')).toBeInTheDocument()
  })

  it('handles avatar file upload validation, cancel, and save flows (success, API error, and catch block)', async () => {
    class MockFileReader {
      onloadend: (() => void) | null = null
      result = 'data:image/png;base64,newavatar'
      readAsDataURL() {
        if (this.onloadend) this.onloadend()
      }
    }
    vi.stubGlobal('FileReader', MockFileReader)

    render(<ProfileSettings />)
    await waitFor(() =>
      expect(screen.getByText('Jenny Admin')).toBeInTheDocument(),
    )

    const fileInput = document.querySelector(
      '#avatar-upload',
    ) as HTMLInputElement

    // 1. Guard when no file is selected
    fireEvent.change(fileInput, { target: { files: [] } })

    // 2. File > 5MB error
    const largeFile = new File(['dummy'], 'large.png', { type: 'image/png' })
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 })
    fireEvent.change(fileInput, { target: { files: [largeFile] } })
    expect(
      screen.getByText('Image size must be less than 5MB'),
    ).toBeInTheDocument()

    // 3. Valid file upload & Cancel
    const validFile = new File(['dummy'], 'avatar.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [validFile] } })
    expect(
      screen.getByRole('button', { name: 'Save Avatar' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(
      screen.queryByRole('button', { name: 'Save Avatar' }),
    ).not.toBeInTheDocument()

    // 4. Re-upload & Save Avatar -> Cancel confirmation modal first, then API Error with custom message & fallback message
    fireEvent.change(fileInput, { target: { files: [validFile] } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Avatar' }))
    expect(screen.getByText('Update Profile Picture?')).toBeInTheDocument()
    const cancelBtns = screen.getAllByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelBtns[cancelBtns.length - 1])
    expect(
      screen.queryByText('Update Profile Picture?'),
    ).not.toBeInTheDocument()

    vi.mocked(authClient.updateUser).mockResolvedValueOnce({
      error: { message: 'Avatar upload failed' },
    } as any)
    fireEvent.click(screen.getByRole('button', { name: 'Save Avatar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save Changes' }))
    await waitFor(() => {
      expect(screen.getByText('Avatar upload failed')).toBeInTheDocument()
    })

    vi.mocked(authClient.updateUser).mockResolvedValueOnce({
      error: { message: '' },
    } as any)
    fireEvent.click(screen.getByRole('button', { name: 'Save Avatar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save Changes' }))
    await waitFor(() => {
      expect(screen.getByText('Failed to update avatar')).toBeInTheDocument()
    })

    // 5. Save Avatar -> Catch block (thrown error)
    vi.mocked(authClient.updateUser).mockRejectedValueOnce(
      new Error('Network error'),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save Avatar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save Changes' }))
    await waitFor(() => {
      expect(
        screen.getByText('An unexpected error occurred.'),
      ).toBeInTheDocument()
    })

    // 6. Save Avatar -> Success
    vi.mocked(authClient.updateUser).mockResolvedValueOnce({
      error: null,
    } as any)
    fireEvent.click(screen.getByRole('button', { name: 'Save Avatar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save Changes' }))
    await waitFor(() => {
      expect(
        screen.getByText('Profile picture updated successfully!'),
      ).toBeInTheDocument()
      expect(logProfileActivity).toHaveBeenCalledWith({
        data: {
          action: 'AVATAR_UPDATED',
          description: 'Updated profile picture avatar',
        },
      })
    })
  })

  it('handles personal info name change, cancel, and save flows (success, API error, and catch block)', async () => {
    render(<ProfileSettings />)
    await waitFor(() =>
      expect(screen.getByDisplayValue('Jenny Admin')).toBeInTheDocument(),
    )

    const nameInput = screen.getByLabelText(/full name/i)

    // 1. Change name and cancel
    fireEvent.change(nameInput, { target: { value: 'Updated Jenny' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(nameInput).toHaveValue('Jenny Admin')

    // 2. Change name and trigger API error (custom + fallback)
    fireEvent.change(nameInput, { target: { value: 'Updated Jenny' } })
    vi.mocked(authClient.updateUser).mockResolvedValueOnce({
      error: { message: 'Name update error' },
    } as any)
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save Changes' }))
    await waitFor(() => {
      expect(screen.getByText('Name update error')).toBeInTheDocument()
    })

    vi.mocked(authClient.updateUser).mockResolvedValueOnce({
      error: { message: '' },
    } as any)
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save Changes' }))
    await waitFor(() => {
      expect(screen.getByText('Failed to update profile')).toBeInTheDocument()
    })

    // 3. Catch block on unexpected rejection
    vi.mocked(authClient.updateUser).mockRejectedValueOnce(new Error('Crash'))
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save Changes' }))
    await waitFor(() => {
      expect(
        screen.getByText('An unexpected error occurred.'),
      ).toBeInTheDocument()
    })

    // 4. Successful save
    vi.mocked(authClient.updateUser).mockResolvedValueOnce({
      error: null,
    } as any)
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save Changes' }))
    await waitFor(() => {
      expect(
        screen.getByText('Personal information updated successfully!'),
      ).toBeInTheDocument()
      expect(logProfileActivity).toHaveBeenCalledWith({
        data: {
          action: 'PROFILE_UPDATED',
          description: 'Updated full name to "Updated Jenny"',
        },
      })
    })
  })

  it('handles password validation, cancel, and save flows (success, API error, and catch block)', async () => {
    render(<ProfileSettings />)
    await waitFor(() =>
      expect(screen.getByText('Jenny Admin')).toBeInTheDocument(),
    )

    const currentPw = screen.getByLabelText(/current password/i)
    const newPw = screen.getByLabelText(/^new password$/i)
    const confirmPw = screen.getByLabelText(/confirm new password/i)

    // 1. Type and cancel password input
    fireEvent.change(currentPw, { target: { value: 'oldpass123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(currentPw).toHaveValue('')

    // 2. Password < 8 chars validation
    fireEvent.change(currentPw, { target: { value: 'oldpass123' } })
    fireEvent.change(newPw, { target: { value: 'short' } })
    fireEvent.change(confirmPw, { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }))
    expect(
      screen.getByText('New password must be at least 8 characters long.'),
    ).toBeInTheDocument()

    // 3. Passwords do not match validation
    fireEvent.change(newPw, { target: { value: 'validpass123' } })
    fireEvent.change(confirmPw, { target: { value: 'different123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }))
    expect(screen.getByText('New passwords do not match.')).toBeInTheDocument()

    // 4. API Error (custom + fallback)
    fireEvent.change(confirmPw, { target: { value: 'validpass123' } })
    vi.mocked(authClient.changePassword).mockResolvedValueOnce({
      error: { message: 'Incorrect current password' },
    } as any)
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save Changes' }))
    await waitFor(() => {
      expect(screen.getByText('Incorrect current password')).toBeInTheDocument()
    })

    vi.mocked(authClient.changePassword).mockResolvedValueOnce({
      error: { message: '' },
    } as any)
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save Changes' }))
    await waitFor(() => {
      expect(screen.getByText('Failed to update password.')).toBeInTheDocument()
    })

    // 5. Catch block on unexpected rejection
    vi.mocked(authClient.changePassword).mockRejectedValueOnce(
      new Error('Crash'),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save Changes' }))
    await waitFor(() => {
      expect(
        screen.getByText(
          'An unexpected error occurred while updating password.',
        ),
      ).toBeInTheDocument()
    })

    // 6. Successful password change
    vi.mocked(authClient.changePassword).mockResolvedValueOnce({
      error: null,
    } as any)
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Save Changes' }))
    await waitFor(() => {
      expect(
        screen.getByText(
          'Password updated successfully! Other active sessions revoked.',
        ),
      ).toBeInTheDocument()
      expect(logProfileActivity).toHaveBeenCalledWith({
        data: {
          action: 'PASSWORD_UPDATED',
          description: 'Changed account password and revoked other sessions',
        },
      })
    })
  })
})
