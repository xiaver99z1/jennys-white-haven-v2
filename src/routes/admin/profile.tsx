import { createFileRoute } from '@tanstack/react-router'
import { authClient } from '#/lib/auth-client'
import { logProfileActivity } from '#/server/profile-actions' // 👈 Import server action
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/admin/profile')({
  component: AdminProfilePage,
})

function AdminProfilePage() {
  const [session, setSession] = useState<any>(null)

  // Profile Info States
  const [name, setName] = useState('')
  const [initialName, setInitialName] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [initialImage, setInitialImage] = useState<string | null>(null)

  // Password States
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Loading & Message States
  const [profileLoading, setProfileLoading] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (data?.user) {
        setSession(data)
        setName(data.user.name || '')
        setInitialName(data.user.name || '')
        setImage(data.user.image || null)
        setInitialImage(data.user.image || null)
      }
    })
  }, [])

  // Change Detection Flags
  const hasNameChanged = name !== initialName
  const hasAvatarChanged = image !== initialImage
  const hasPasswordInput =
    currentPassword.length > 0 ||
    newPassword.length > 0 ||
    confirmPassword.length > 0

  // Cancel Handlers
  const handleCancelAvatar = () => {
    setImage(initialImage)
    setMessage(null)
  }

  const handleCancelPersonalInfo = () => {
    setName(initialName)
    setMessage(null)
  }

  const handleCancelPassword = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setMessage(null)
  }

  // Handle Avatar Image Upload & Auto-Compress
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB' })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Save Avatar Only
  const handleSaveAvatar = async () => {
    setAvatarLoading(true)
    setMessage(null)

    try {
      const { error } = await authClient.updateUser({ image })

      if (error) {
        setMessage({
          type: 'error',
          text: error.message || 'Failed to update avatar',
        })
      } else {
        setInitialImage(image)
        setMessage({
          type: 'success',
          text: 'Profile picture updated successfully!',
        })

        // 👈 Log avatar update activity
        await logProfileActivity({
          data: {
            action: 'AVATAR_UPDATED',
            description: 'Updated profile picture avatar',
          },
        })

        window.dispatchEvent(
          new CustomEvent('user-profile-updated', { detail: { name, image } }),
        )
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' })
    } finally {
      setAvatarLoading(false)
    }
  }

  // Save Personal Info Only
  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileLoading(true)
    setMessage(null)

    try {
      const { error } = await authClient.updateUser({ name })

      if (error) {
        setMessage({
          type: 'error',
          text: error.message || 'Failed to update profile',
        })
      } else {
        setInitialName(name)
        setMessage({
          type: 'success',
          text: 'Personal information updated successfully!',
        })

        // 👈 Log personal info update activity
        await logProfileActivity({
          data: {
            action: 'PROFILE_UPDATED',
            description: `Updated full name to "${name}"`,
          },
        })

        window.dispatchEvent(
          new CustomEvent('user-profile-updated', { detail: { name, image } }),
        )
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' })
    } finally {
      setProfileLoading(false)
    }
  }

  // Save New Password Only
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (newPassword.length < 8) {
      setMessage({
        type: 'error',
        text: 'New password must be at least 8 characters long.',
      })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' })
      return
    }

    setPasswordLoading(true)

    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      })

      if (error) {
        setMessage({
          type: 'error',
          text: error.message || 'Failed to update password.',
        })
      } else {
        setMessage({
          type: 'success',
          text: 'Password updated successfully! Other active sessions revoked.',
        })

        // 👈 Log password update activity
        await logProfileActivity({
          data: {
            action: 'PASSWORD_UPDATED',
            description: 'Changed account password and revoked other sessions',
          },
        })

        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred while updating password.',
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Account Settings</h1>
        <p className="text-sm text-stone-500 mt-1">
          Manage your account profile details, avatar, and security credentials.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile Header & Avatar Card */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <label
            htmlFor="avatar-upload"
            className="cursor-pointer relative group"
          >
            {image ? (
              <img
                src={image}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-amber-600/40 shadow-xs group-hover:opacity-90 transition"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-800 font-bold text-xl flex items-center justify-center border-2 border-amber-600/40 shadow-xs">
                {name ? name.charAt(0).toUpperCase() : 'A'}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition">
              Upload
            </div>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </label>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-stone-900">
                {name || 'Admin User'}
              </h2>
              {session?.user?.role && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 rounded-md">
                  {session.user.role}
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {session?.user?.email}
            </p>
            <p className="text-[11px] text-stone-400 mt-1">
              Click avatar image to upload & auto-compress (Max 5MB)
            </p>
          </div>
        </div>

        {/* Action Buttons for Avatar */}
        {hasAvatarChanged && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCancelAvatar}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAvatar}
              disabled={avatarLoading}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {avatarLoading ? 'Saving Avatar...' : 'Save Avatar'}
            </button>
          </div>
        )}
      </div>

      {/* Personal Information Form */}
      <form
        onSubmit={handleSavePersonalInfo}
        className="bg-white p-6 rounded-2xl shadow-xs border border-stone-200 space-y-4"
      >
        <div>
          <h3 className="text-base font-semibold text-stone-900">
            Personal Information
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Update your public profile details.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600 transition text-stone-800"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
            Email Address
          </label>
          <input
            type="email"
            disabled
            value={session?.user?.email || ''}
            className="w-full px-3.5 py-2 text-sm bg-stone-100 border border-stone-200 rounded-lg text-stone-500 cursor-not-allowed"
          />
          <p className="text-[11px] text-stone-400">
            Email updates are restricted by system policy.
          </p>
        </div>

        {hasNameChanged && (
          <div className="flex justify-end items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancelPersonalInfo}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={profileLoading}
              className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {profileLoading ? 'Saving Profile...' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>

      {/* Security & Password Update Form */}
      <form
        onSubmit={handleSavePassword}
        className="bg-white p-6 rounded-2xl shadow-xs border border-stone-200 space-y-4"
      >
        <div>
          <h3 className="text-base font-semibold text-stone-900">
            Security & Password
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Update your password to keep your admin account safe.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
            Current Password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600 transition text-stone-800"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600 transition text-stone-800"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600 transition text-stone-800"
            />
          </div>
        </div>

        {hasPasswordInput && (
          <div className="flex justify-end items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancelPassword}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {passwordLoading ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
