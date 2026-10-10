import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useRef } from 'react'
import { authClient } from '#/lib/auth-client'
import { uploadAvatar } from '#/server/upload' // Update import path if different

export const Route = createFileRoute('/admin/profile')({
  head: () => ({
    meta: [{ title: "Profile | Jenny's White Haven" }],
  }),
  component: AdminProfilePage,
})

function AdminProfilePage() {
  const [session, setSession] = useState<any>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [image, setImage] = useState('')

  // Password Update State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // UI Feedback States
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' })
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' })
  const [updatingProfile, setUpdatingProfile] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch Session
  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (data) {
        setSession(data)
        setName(data.user?.name || '')
        setEmail(data.user?.email || '')
        setImage(data.user?.image || '')
      }
    })
  }, [])

  // Auto-dismiss Profile Message after 2 seconds
  useEffect(() => {
    if (!profileMessage.text) return
    const timer = setTimeout(() => {
      setProfileMessage({ type: '', text: '' })
    }, 2000)
    return () => clearTimeout(timer)
  }, [profileMessage])

  // Auto-dismiss Password Message after 2 seconds
  useEffect(() => {
    if (!passwordMessage.text) return
    const timer = setTimeout(() => {
      setPasswordMessage({ type: '', text: '' })
    }, 2000)
    return () => clearTimeout(timer)
  }, [passwordMessage])

  // Image upload and processing logic
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (
      !['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(
        file.type,
      )
    ) {
      setProfileMessage({
        type: 'error',
        text: 'Please select a valid image file (JPEG, PNG, or WebP).',
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileMessage({
        type: 'error',
        text: 'Image size must be less than 5MB.',
      })
      return
    }

    setUploadingImage(true)
    setProfileMessage({ type: '', text: '' })

    try {
      const compressedDataUrl = await resizeImage(file, 400, 400, 0.8)

      const response = await fetch(compressedDataUrl)
      const blob = await response.blob()
      const compressedFile = new File([blob], 'avatar.webp', {
        type: 'image/webp',
      })

      const formData = new FormData()
      formData.append('file', compressedFile)
      if (image) {
        formData.append('oldImageUrl', image)
      }

      const avatarUrl = await uploadAvatar({ data: formData })

      setImage(avatarUrl)
      setProfileMessage({
        type: 'success',
        text: 'Avatar uploaded successfully! Click "Save Changes" to apply to your profile.',
      })
    } catch (err) {
      console.error(err)
      setProfileMessage({
        type: 'error',
        text: 'Failed to process image. Please try again.',
      })
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const resizeImage = (
    file: File,
    targetWidth: number,
    targetHeight: number,
    quality: number,
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img')
      const objectUrl = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(objectUrl)
        const canvas = document.createElement('canvas')
        canvas.width = targetWidth
        canvas.height = targetHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        const minSide = Math.min(img.width, img.height)
        const startX = (img.width - minSide) / 2
        const startY = (img.height - minSide) / 2

        ctx.drawImage(
          img,
          startX,
          startY,
          minSide,
          minSide,
          0,
          0,
          targetWidth,
          targetHeight,
        )
        resolve(canvas.toDataURL('image/webp', quality))
      }

      img.onerror = (error) => {
        URL.revokeObjectURL(objectUrl)
        reject(error)
      }

      img.src = objectUrl
    })
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMessage({ type: '', text: '' })
    setUpdatingProfile(true)

    try {
      const { error } = await authClient.updateUser({
        name,
        image,
      })

      if (error) {
        setProfileMessage({
          type: 'error',
          text: error.message || 'Failed to update profile.',
        })
      } else {
        setProfileMessage({
          type: 'success',
          text: 'Profile updated successfully!',
        })
      }
    } catch (err) {
      setProfileMessage({
        type: 'error',
        text: 'An unexpected error occurred.',
      })
    } finally {
      setUpdatingProfile(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage({ type: '', text: '' })

    // Validate Password Complexity Rules
    const isLengthValid = newPassword.length >= 8 && newPassword.length <= 128
    const hasUpper = /[A-Z]/.test(newPassword)
    const hasLower = /[a-z]/.test(newPassword)
    const hasNumber = /[0-9]/.test(newPassword)
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword)

    if (!isLengthValid || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setPasswordMessage({
        type: 'error',
        text: 'Password must be 8–128 characters and include uppercase, lowercase, number, and special character.',
      })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' })
      return
    }

    setUpdatingPassword(true)

    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      })

      if (error) {
        setPasswordMessage({
          type: 'error',
          text: error.message || 'Failed to change password.',
        })
      } else {
        setPasswordMessage({
          type: 'success',
          text: 'Password changed successfully!',
        })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      setPasswordMessage({
        type: 'error',
        text: 'An unexpected error occurred.',
      })
    } finally {
      setUpdatingPassword(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Title Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
          Account Settings
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Manage your account profile details, avatar, and authentication
          credentials.
        </p>
      </div>

      {/* User Header Summary Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200/80 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative group shrink-0">
          {image ? (
            <img
              src={image}
              alt={name || 'Admin'}
              className="w-20 h-20 rounded-full object-cover border-2 border-amber-600/30 shadow-xs"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 text-amber-800 font-bold text-2xl flex items-center justify-center border-2 border-amber-600/30 shadow-xs">
              {name ? name.charAt(0).toUpperCase() : 'A'}
            </div>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition cursor-pointer text-xs font-medium"
          >
            {uploadingImage ? 'Uploading...' : 'Change'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            onChange={handleImageSelect}
          />
        </div>

        <div className="text-center sm:text-left space-y-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-lg font-bold text-stone-900">
              {name || 'Administrator'}
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-100/80 rounded-full border border-amber-200">
              Admin
            </span>
          </div>
          <p className="text-sm text-stone-500">
            {email || 'admin@jennyswhitehaven.com'}
          </p>
          <p className="text-xs text-stone-400">
            Click avatar image to upload & auto-compress (Max 5MB)
          </p>
        </div>
      </div>

      {/* Profile Form Grid */}
      <div className="grid grid-cols-1 gap-8">
        {/* Personal Details Section */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-stone-200/80">
          <h3 className="text-base font-semibold text-stone-900 mb-1">
            Personal Information
          </h3>
          <p className="text-xs text-stone-500 mb-6">
            Update your public profile details and avatar.
          </p>

          {profileMessage.text && (
            <div
              className={`mb-6 p-3.5 text-sm rounded-lg border flex items-center justify-between transition-all duration-300 ${
                profileMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-600 border-red-200'
              }`}
            >
              <span>{profileMessage.text}</span>
              <button
                type="button"
                onClick={() => setProfileMessage({ type: '', text: '' })}
                className="text-xs opacity-70 hover:opacity-100 ml-4 font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jenny White"
                required
                className="w-full px-4 py-2.5 text-sm bg-stone-50/80 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600 transition placeholder:text-stone-400 text-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                disabled
                placeholder="e.g. admin@jennyswhitehaven.com"
                className="w-full px-4 py-2.5 text-sm bg-stone-100 border border-stone-200 rounded-lg text-stone-500 cursor-not-allowed"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                Email updates are restricted by system policy.
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={updatingProfile || uploadingImage}
                className="bg-amber-700 hover:bg-amber-800 text-white font-medium px-5 py-2.5 rounded-lg shadow-xs transition cursor-pointer text-sm disabled:opacity-60"
              >
                {updatingProfile ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Section */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-stone-200/80">
          <h3 className="text-base font-semibold text-stone-900 mb-1">
            Security & Password
          </h3>
          <p className="text-xs text-stone-500 mb-6">
            Ensure your account remains secure with a strong password.
          </p>

          {passwordMessage.text && (
            <div
              className={`mb-6 p-3.5 text-sm rounded-lg border flex items-center justify-between transition-all duration-300 ${
                passwordMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-600 border-red-200'
              }`}
            >
              <span>{passwordMessage.text}</span>
              <button
                type="button"
                onClick={() => setPasswordMessage({ type: '', text: '' })}
                className="text-xs opacity-70 hover:opacity-100 ml-4 font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                className="w-full px-4 py-2.5 text-sm bg-stone-50/80 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600 transition placeholder:text-stone-400 text-stone-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  maxLength={128}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8-128 characters"
                  required
                  className="w-full px-4 py-2.5 text-sm bg-stone-50/80 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600 transition placeholder:text-stone-400 text-stone-800"
                />
                {/* Permanent Requirements Guide & Live Checklist */}
                <PasswordRequirements password={newPassword} />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  maxLength={128}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  className="w-full px-4 py-2.5 text-sm bg-stone-50/80 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-600 transition placeholder:text-stone-400 text-stone-800"
                />
              </div>
            </div>

            {/* Warning Info & Submit Button Row */}
            <div className="pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200/80 px-3 py-2 rounded-lg">
                <svg
                  className="w-4 h-4 text-amber-600 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>
                  Changing your password will sign out all other active
                  sessions.
                </span>
              </div>

              <button
                type="submit"
                disabled={updatingPassword}
                className="bg-stone-800 hover:bg-stone-900 text-white font-medium px-5 py-2.5 rounded-lg shadow-xs transition cursor-pointer text-sm disabled:opacity-60 shrink-0 ml-auto sm:ml-0"
              >
                {updatingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Helper Component for Permanent Guide & Live Password Checklist
function PasswordRequirements({ password }: { password: string }) {
  const requirements = [
    {
      label: '8 to 128 characters',
      valid: password.length >= 8 && password.length <= 128,
    },
    {
      label: 'At least one uppercase letter (A-Z)',
      valid: /[A-Z]/.test(password),
    },
    {
      label: 'At least one lowercase letter (a-z)',
      valid: /[a-z]/.test(password),
    },
    { label: 'At least one number (0-9)', valid: /[0-9]/.test(password) },
    {
      label: 'At least one special character (!@#$%^&*)',
      valid: /[^A-Za-z0-9]/.test(password),
    },
  ]

  return (
    <div className="mt-2.5 p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-1 text-xs">
      <p className="font-semibold text-stone-600 mb-1">
        Password Requirements:
      </p>
      {requirements.map((req, idx) => {
        // If password is empty, show neutral circle. Once typing starts, show green check or red/gray bullet.
        const isTyped = password.length > 0
        const icon = isTyped ? (req.valid ? '✓' : '○') : '•'
        const textColor = isTyped
          ? req.valid
            ? 'text-emerald-700 font-medium'
            : 'text-stone-500'
          : 'text-stone-500'
        const iconColor = isTyped
          ? req.valid
            ? 'text-emerald-600 font-bold'
            : 'text-stone-400'
          : 'text-stone-400'

        return (
          <div key={idx} className="flex items-center gap-2">
            <span className={iconColor}>{icon}</span>
            <span className={textColor}>{req.label}</span>
          </div>
        )
      })}
    </div>
  )
}
