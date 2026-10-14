import { useState, useEffect } from 'react'
import { getUserSessions, revokeSession } from '#/server/session-actions'
import { parseUserAgent } from '#/lib/parse-user-agent'
import { Laptop, History, ShieldAlert, CheckCircle2 } from 'lucide-react'

interface SessionItem {
  id: string
  token: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  expiresAt: Date
}

interface UserSessionsModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userName: string
}

export function UserSessionsModal({
  isOpen,
  onClose,
  userId,
  userName,
}: UserSessionsModalProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active')
  const [activeSessions, setActiveSessions] = useState<SessionItem[]>([])
  const [sessionHistory, setSessionHistory] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const res = await getUserSessions({ data: { userId } })
      if (res.success) {
        setActiveSessions(res.activeSessions)
        setSessionHistory(res.sessionHistory)
      }
    } catch (err) {
      console.error('Failed to load user sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && userId) {
      fetchSessions()
    }
  }, [isOpen, userId])

  const handleRevoke = async (token: string) => {
    try {
      const res = await revokeSession({ data: { token } })
      if (res.success) {
        // Refresh session lists after revoking
        fetchSessions()
      }
    } catch (err) {
      console.error('Failed to terminate session:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <h3 className="text-xl font-bold text-stone-900">User Sessions</h3>
            <p className="text-sm text-stone-500">
              Managing login activity for{' '}
              <span className="font-semibold text-stone-700">{userName}</span>
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'active'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              Active ({activeSessions.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'history'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              History ({sessionHistory.length})
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="py-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-stone-400">
              Loading session data...
            </div>
          ) : activeTab === 'active' ? (
            /* ACTIVE SESSIONS TAB */
            activeSessions.length === 0 ? (
              <div className="py-12 text-center text-sm text-stone-400">
                No active sessions found.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-stone-200">
                <table className="w-full text-left text-xs text-stone-600">
                  <thead className="bg-stone-50 uppercase tracking-wider text-stone-500 border-b border-stone-200 font-semibold">
                    <tr>
                      <th className="px-5 py-3">Device / Browser</th>
                      <th className="px-5 py-3">IP Address</th>
                      <th className="px-5 py-3">Signed In</th>
                      <th className="px-5 py-3">Expires</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {activeSessions.map((session) => (
                      <tr
                        key={session.id}
                        className="hover:bg-stone-50/50 transition"
                      >
                        <td
                          className="px-5 py-3 font-medium text-stone-900"
                          title={session.userAgent || ''}
                        >
                          {parseUserAgent(session.userAgent)}
                        </td>
                        <td className="px-5 py-3 text-stone-600">
                          {session.ipAddress || '127.0.0.1'}
                        </td>
                        <td className="px-5 py-3 text-stone-600">
                          {new Date(session.createdAt).toLocaleDateString()}{' '}
                          {new Date(session.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-5 py-3 text-stone-600">
                          {new Date(session.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleRevoke(session.token)}
                            className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition"
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : /* SESSION HISTORY TAB */
          sessionHistory.length === 0 ? (
            <div className="py-12 text-center text-sm text-stone-400">
              No past session history found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 uppercase tracking-wider text-stone-500 border-b border-stone-200 font-semibold">
                  <tr>
                    <th className="px-5 py-3">Device / Browser</th>
                    <th className="px-5 py-3">IP Address</th>
                    <th className="px-5 py-3">Logged In</th>
                    <th className="px-5 py-3">Ended / Expired At</th>
                    <th className="px-5 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {sessionHistory.map((session) => (
                    <tr
                      key={session.id}
                      className="hover:bg-stone-50/50 transition text-stone-500"
                    >
                      <td
                        className="px-5 py-3 font-medium text-stone-800"
                        title={session.userAgent || ''}
                      >
                        {parseUserAgent(session.userAgent)}
                      </td>
                      <td className="px-5 py-3">
                        {session.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="px-5 py-3">
                        {new Date(session.createdAt).toLocaleDateString()}{' '}
                        {new Date(session.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-3">
                        {new Date(session.expiresAt).toLocaleDateString()}{' '}
                        {new Date(session.expiresAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600">
                          Expired / Revoked
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-stone-100">
          <button
            onClick={onClose}
            className="rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-white shadow hover:bg-stone-800 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
