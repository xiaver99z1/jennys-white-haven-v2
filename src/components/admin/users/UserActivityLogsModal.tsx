import { useState, useEffect } from 'react'
import { getUserActivityLogs } from '#/server/activity-actions'
import { parseUserAgent } from '#/lib/parse-user-agent'
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
} from 'lucide-react'

interface ActivityLogItem {
  id: string
  action: string
  description: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

interface UserActivityLogsModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userName: string
}

export function UserActivityLogsModal({
  isOpen,
  onClose,
  userId,
  userName,
}: UserActivityLogsModalProps) {
  const [logs, setLogs] = useState<ActivityLogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAction, setSelectedAction] = useState<string>('ALL')

  // Date & Time Range Filters
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await getUserActivityLogs({ data: { userId } })
      if (res.success) {
        setLogs(res.logs)
      }
    } catch (err) {
      console.error('Failed to load activity logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && userId) {
      fetchLogs()
      setSearchQuery('')
      setSelectedAction('ALL')
      setStartDate('')
      setEndDate('')
      setCurrentPage(1)
    }
  }, [isOpen, userId])

  // Reset pagination when any filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedAction, startDate, endDate])

  const availableActions = [
    'ALL',
    ...Array.from(new Set(logs.map((l) => l.action))),
  ]

  // Filter logs based on search query, action, parsed device/browser, formatted timestamp, and datetime range
  const filteredLogs = logs.filter((log) => {
    // 1. Action Filter
    const matchesAction =
      selectedAction === 'ALL' || log.action === selectedAction

    // 2. Parsed Device/Browser & Formatted Timestamp Search
    const parsedDevice = parseUserAgent(log.userAgent).toLowerCase()
    const formattedDate = new Date(log.createdAt).toLocaleDateString()
    const formattedTime = new Date(log.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
    const fullFormattedTimestamp =
      `${formattedDate} ${formattedTime}`.toLowerCase()

    const query = searchQuery.toLowerCase()
    const matchesSearch =
      log.description.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      (log.ipAddress && log.ipAddress.includes(query)) ||
      parsedDevice.includes(query) ||
      fullFormattedTimestamp.includes(query)

    // 3. Exact Date & Time Range Filter
    const logDate = new Date(log.createdAt)
    let matchesDateRange = true

    if (startDate) {
      const start = new Date(startDate)
      if (logDate < start) matchesDateRange = false
    }

    if (endDate) {
      const end = new Date(endDate)
      if (logDate > end) matchesDateRange = false
    }

    return matchesAction && matchesSearch && matchesDateRange
  })

  // Pagination Logic (10 items per page)
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedLogs = filteredLogs.slice(
    startIndex,
    startIndex + itemsPerPage,
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" />
              Activity Audit Log
            </h3>
            <p className="text-sm text-stone-500">
              Tracking actions and security events for{' '}
              <span className="font-semibold text-stone-700">{userName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col gap-3 py-4 border-b border-stone-100">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search description, device, date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-amber-600 transition"
              />
            </div>

            {/* Action Select Dropdown */}
            <div className="relative w-full sm:w-56">
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full appearance-none rounded-xl border border-stone-200 bg-white px-3.5 py-2 pr-8 text-xs font-semibold text-stone-700 outline-none transition focus:border-amber-600 focus:ring-1 focus:ring-amber-600 cursor-pointer"
              >
                <option value="ALL">All Actions</option>
                {availableActions
                  .filter((action) => action !== 'ALL')
                  .map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Date & Time Range Filter Row */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 pt-1">
            <Calendar className="w-4 h-4 text-stone-400" />
            <span>From:</span>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs text-stone-700 focus:outline-none focus:border-amber-600 transition cursor-pointer"
            />
            <span>To:</span>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs text-stone-700 focus:outline-none focus:border-amber-600 transition cursor-pointer"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                }}
                className="text-[11px] font-semibold text-amber-700 hover:underline ml-2 cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Content Table */}
        <div className="py-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-sm text-stone-400">
              Loading activity logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-sm text-stone-400">
              {logs.length === 0
                ? 'No activity logs recorded for this user yet.'
                : 'No logs match your search filters.'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 uppercase tracking-wider text-stone-500 border-b border-stone-200 font-semibold">
                  <tr>
                    <th className="px-5 py-3">Action</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3">IP Address</th>
                    <th className="px-5 py-3">Device / Browser</th>
                    <th className="px-5 py-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {paginatedLogs.map((log) => {
                    const parsedDevice = parseUserAgent(log.userAgent)
                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-stone-50/50 transition"
                      >
                        <td className="px-5 py-3 font-semibold text-stone-900">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] bg-amber-50 text-amber-800 border border-amber-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-stone-700 font-medium">
                          {log.description}
                        </td>
                        <td className="px-5 py-3 text-stone-500">
                          {log.ipAddress || '127.0.0.1'}
                        </td>
                        <td
                          className="px-5 py-3 text-stone-500"
                          title={log.userAgent || ''}
                        >
                          {parsedDevice}
                        </td>
                        <td className="px-5 py-3 text-right text-stone-500">
                          {new Date(log.createdAt).toLocaleDateString()}{' '}
                          {new Date(log.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer with Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-100">
          <span className="text-xs text-stone-500">
            Showing{' '}
            <span className="font-semibold text-stone-700">
              {filteredLogs.length === 0 ? 0 : startIndex + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-stone-700">
              {Math.min(startIndex + itemsPerPage, filteredLogs.length)}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-stone-700">
              {filteredLogs.length}
            </span>{' '}
            entries
          </span>

          <div className="flex items-center gap-2">
            {totalPages > 1 && (
              <div className="flex items-center gap-1 mr-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 text-xs font-semibold text-stone-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-white shadow hover:bg-stone-800 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
