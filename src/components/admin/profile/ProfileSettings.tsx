import { useState, useEffect } from 'react'
import { useCooldown } from '#/components/admin/auth/AuthPageShell'
import { PasswordInput } from '#/components/common/PasswordInput'
import { authClient } from '#/lib/auth-client'
import {
  compressImageForUpload,
  IMAGE_UPLOAD_PRESETS,
} from '#/lib/image-compress'
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_RESET_COOLDOWN_SECONDS,
  formatCooldownDuration,
} from '#/lib/constants/auth'
import { formatRoleLabel, getErrorMessage } from '#/lib/formatters'
import {
  logProfileActivity,
  saveProfileAvatar,
} from '#/server/profile-actions'
import { requestPasswordReset } from '#/server/auth-actions'
import { uploadAvatar } from '#/server/upload'
import { ConfirmModal } from '#/components/common/ConfirmModal'
import type { StatusMessage } from '#/types'

export function ProfileSettings() {
  const [session, setSession] = useState<any>(null)

  // Profile Info States
  const [name, setName] = useState('')
  const [initialName, setInitialName] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [initialImage, setInitialImage] = useState<string | null>(null)
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)

  // Password States
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Loading & Message States
  const [profileLoading, setProfileLoading] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [resetEmailLoading, setResetEmailLoading] = useState(false)
  const {
    cooldown: resetCooldown,
    isCoolingDown: isResetCoolingDown,
    startCooldown: startResetCooldown,
  } = useCooldown()
  const [confirmAction, setConfirmAction] = useState<
    'avatar' | 'profile' | 'password' | null
  >(null)
  const [message, setMessage] = useState<StatusMessage | null>(null)

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
    setPendingAvatarFile(null)
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
    setShowCurrentPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    setMessage(null)
  }

  // Handle Avatar Image Upload & Preview
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage({
        type: 'error',
        text: 'Please select a valid image file (JPG, PNG, WEBP, GIF).',
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB' })
      return
    }

    setPendingAvatarFile(file)

    const reader = new FileReader()
    reader.onloadend = () => {
      setImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Save Avatar Only (compresses + uploads to Cloudflare R2 + links User.profileMedia)
  const handleSaveAvatar = async () => {
    setConfirmAction(null)
    setAvatarLoading(true)
    setMessage(null)

    try {
      let nextImage = image
      if (pendingAvatarFile) {
        const compressed = await compressImageForUpload(
          pendingAvatarFile,
          IMAGE_UPLOAD_PRESETS.avatar.maxDimension,
          IMAGE_UPLOAD_PRESETS.avatar.quality,
        )
        const formData = new FormData()
        formData.append('file', compressed)
        formData.append('scope', 'avatars')
        nextImage = await uploadAvatar({ data: formData })
      }

      const res = await saveProfileAvatar({ data: { image: nextImage } })

      if (!res.success) {
        setMessage({
          type: 'error',
          text: res.error || 'Failed to update avatar',
        })
      } else {
        const savedUrl = res.image ?? nextImage
        setImage(savedUrl)
        setInitialImage(savedUrl)
        setPendingAvatarFile(null)
        setMessage({
          type: 'success',
          text: 'Profile picture updated successfully!',
        })

        await logProfileActivity({
          data: {
            action: 'AVATAR_UPDATED',
            description: 'Updated profile picture avatar',
          },
        })

        window.dispatchEvent(
          new CustomEvent('user-profile-updated', {
            detail: { name, image: savedUrl },
          }),
        )
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' })
    } finally {
      setAvatarLoading(false)
    }
  }

  // Save Personal Info Only
  const handlePreSavePersonalInfo = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setConfirmAction('profile')
  }

  const handleSavePersonalInfo = async () => {
    setConfirmAction(null)
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
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' })
    } finally {
      setProfileLoading(false)
    }
  }

  // Save New Password Only
  const handlePreSavePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setMessage({
        type: 'error',
        text: `New password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
      })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' })
      return
    }

    setConfirmAction('password')
  }

  const handleSavePassword = async () => {
    setConfirmAction(null)
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

        await logProfileActivity({
          data: {
            action: 'PASSWORD_UPDATED',
            description: 'Changed account password and revoked other sessions',
          },
        })

        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setShowCurrentPassword(false)
        setShowNewPassword(false)
        setShowConfirmPassword(false)
      }
    } catch {
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred while updating password.',
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    setResetEmailLoading(true)
    setMessage(null)

    try {
      const res = await requestPasswordReset()
      startResetCooldown(PASSWORD_RESET_COOLDOWN_SECONDS)
      setMessage({
        type: 'success',
        text: res.message,
      })
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: getErrorMessage(err, 'Failed to send password reset email.'),
      })
    } finally {
      setResetEmailLoading(false)
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
              disabled={avatarLoading}
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
                  {formatRoleLabel(session.user.role)}
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
              disabled={avatarLoading}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction('avatar')}
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
        onSubmit={handlePreSavePersonalInfo}
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
          <label
            htmlFor="full-name"
            className="text-xs font-semibold uppercase tracking-wider text-stone-600"
          >
            Full Name
          </label>
          <input
            id="full-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600 transition text-stone-800"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="email-address"
            className="text-xs font-semibold uppercase tracking-wider text-stone-600"
          >
            Email Address
          </label>
          <input
            id="email-address"
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
        onSubmit={handlePreSavePassword}
        className="bg-white p-6 rounded-2xl shadow-xs border border-stone-200 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-stone-900">
              Security &amp; Password
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Update your password to keep your admin account safe.
            </p>
          </div>
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={resetEmailLoading || isResetCoolingDown}
            className="text-xs font-semibold text-amber-800 hover:text-amber-900 underline self-start sm:self-auto disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
          >
            {resetEmailLoading
              ? 'Sending reset link...'
              : isResetCoolingDown
                ? `Wait ${formatCooldownDuration(resetCooldown)} to resend`
                : 'Forgot password?'}
          </button>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="current-password"
            className="text-xs font-semibold uppercase tracking-wider text-stone-600"
          >
            Current Password
          </label>
          <PasswordInput
            id="current-password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            visible={showCurrentPassword}
            onVisibleChange={setShowCurrentPassword}
            showLabel="Show password"
            hideLabel="Hide password"
            className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600 transition text-stone-800"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label
              htmlFor="new-password"
              className="text-xs font-semibold uppercase tracking-wider text-stone-600"
            >
              New Password
            </label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              visible={showNewPassword}
              onVisibleChange={setShowNewPassword}
              showLabel="Show new password"
              hideLabel="Hide new password"
              className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600 transition text-stone-800"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="confirm-password"
              className="text-xs font-semibold uppercase tracking-wider text-stone-600"
            >
              Confirm New Password
            </label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              visible={showConfirmPassword}
              onVisibleChange={setShowConfirmPassword}
              showLabel="Show password confirmation"
              hideLabel="Hide password confirmation"
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

      <ConfirmModal
        isOpen={confirmAction !== null}
        variant="amber"
        title={
          confirmAction === 'avatar'
            ? 'Update Profile Picture?'
            : confirmAction === 'profile'
              ? 'Update Personal Information?'
              : 'Update Account Password?'
        }
        description={
          confirmAction === 'avatar'
            ? 'Are you sure you want to save your new profile avatar?'
            : confirmAction === 'profile'
              ? `Are you sure you want to update your display name to "${name}"?`
              : 'Are you sure you want to change your password? This will revoke all other active sessions.'
        }
        confirmText="Yes, Save Changes"
        cancelText="Cancel"
        isLoading={avatarLoading || profileLoading || passwordLoading}
        onConfirm={
          confirmAction === 'avatar'
            ? handleSaveAvatar
            : confirmAction === 'profile'
              ? handleSavePersonalInfo
              : handleSavePassword
        }
        onClose={() => setConfirmAction(null)}
      />
    </div>
  )
}
