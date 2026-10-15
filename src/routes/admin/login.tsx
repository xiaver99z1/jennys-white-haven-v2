import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '#/lib/auth-client'
import { logUserLogin } from '#/server/auth-actions'
import { Eye, EyeOff } from 'lucide-react'

export const Route = createFileRoute('/admin/login')({
  head: () => ({
    meta: [{ title: "Login | Jenny's White Haven" }],
    links: [{ rel: 'icon', href: '/logo.png' }],
  }),
  component: AdminLoginPage,
})

function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
      })

      if (error) {
        if (
          error.code === 'EMAIL_NOT_VERIFIED' ||
          error.message?.toLowerCase().includes('verify')
        ) {
          setError(
            'Please check your email and activate your account before logging in.',
          )
        } else {
          setError(error.message || 'Invalid email or password')
        }
        return
      }

      // 👈 Safely trigger the server action to log the login
      await logUserLogin()

      window.location.replace('/admin')
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-sky-200 via-amber-200/60 to-teal-100 px-4">
      <div className="mb-6 flex flex-col items-center">
        <img
          src="/admin-login-logo.png"
          alt="Jenny's White Haven"
          className="h-25 w-auto object-contain"
        />
      </div>

      <div className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-stone-200/80 p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600 transition"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3.5 py-2.5 pr-10 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden transition"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white font-medium py-2.5 rounded-lg shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
