import { useState, useMemo } from 'react'
import { AdminDataTable, type Column } from '#/components/common/AdminDataTable'
import { AddUserModal } from '#/components/admin/users/AddUserModal'
import { EditUserProfileModal } from '#/components/admin/users/EditUserProfileModal'
import { UserActionsDropdown } from '#/components/admin/users/UserActionsDropdown'
import { ResendVerificationModal } from '#/components/admin/users/ResendVerificationModal'

export type User = {
  id: string
  name: string
  email: string
  emailVerified: boolean | Date | null
  image: string | null
  role: string | null
  banned: boolean | null
  createdAt: Date | string
  updatedAt: Date | string
}

type SortField = 'name' | 'role' | 'createdAt'
type SortOrder = 'asc' | 'desc'

function formatDate(dateInput: string | Date) {
  const date = new Date(dateInput)
  const monthNames = [
    'Jan.',
    'Feb.',
    'Mar.',
    'Apr.',
    'May',
    'Jun.',
    'Jul.',
    'Aug.',
    'Sep.',
    'Oct.',
    'Nov.',
    'Dec.',
  ]
  return `${monthNames[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}

function getRoleBadgeColor(role?: string | null) {
  switch (role?.toLowerCase()) {
    case 'owner':
      return 'bg-amber-100 text-amber-900 border-amber-300'
    case 'manager':
      return 'bg-sky-100 text-sky-900 border-sky-300'
    case 'receptionist':
      return 'bg-teal-100 text-teal-900 border-teal-300'
    default:
      return 'bg-stone-100 text-stone-700 border-stone-300'
  }
}

interface UsersListProps {
  initialUsers: User[]
  router: {
    invalidate: () => Promise<any>
  }
}

export function UsersList({ initialUsers, router }: UsersListProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [resendTargetUser, setResendTargetUser] = useState<User | null>(null)

  // Search & Filter state map
  const [searchValues, setSearchValues] = useState<Record<string, string>>({
    name: '',
    role: 'ALL',
    status: 'ALL',
    createdAt: '',
  })

  // Sorting & Pagination
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const handleSearchChange = (key: string, value: string) => {
    setSearchValues((prev) => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setSearchValues({ name: '', role: 'ALL', status: 'ALL', createdAt: '' })
    setSortField('createdAt')
    setSortOrder('desc')
    setCurrentPage(1)
  }

  const handleSort = (field: string) => {
    const typedField = field as SortField
    setSortField(typedField)
    setSortOrder((prev) =>
      sortField === typedField && prev === 'asc' ? 'desc' : 'asc',
    )
  }

  // Reusable Action Handlers for Dropdown
  const handleDropdownOpen = () => {
    router.invalidate()
  }

  const handleEditUser = (targetUser: User) => {
    setEditingUser(targetUser)
  }

  const handleResendUser = (targetUser: User) => {
    setResendTargetUser(targetUser)
  }

  const handleDropdownSuccess = () => {
    router.invalidate()
  }

  const filteredAndSortedUsers = useMemo(() => {
    return initialUsers
      .filter((user) => {
        const userDetailsSearch = searchValues.name || ''
        const matchesUserDetails =
          !userDetailsSearch.trim() ||
          user.name.toLowerCase().includes(userDetailsSearch.toLowerCase()) ||
          user.email.toLowerCase().includes(userDetailsSearch.toLowerCase())

        const roleFilter = searchValues.role || 'ALL'
        const matchesRole =
          roleFilter === 'ALL' ||
          (user.role && user.role.toLowerCase() === roleFilter.toLowerCase())

        const statusFilter = searchValues.status || 'ALL'
        const matchesStatus =
          statusFilter === 'ALL' ||
          (statusFilter === 'blocked' && user.banned) ||
          (statusFilter === 'verified' && !user.banned && user.emailVerified) ||
          (statusFilter === 'pending' && !user.banned && !user.emailVerified)

        const dateFilter = searchValues.createdAt || ''
        const matchesDate = (() => {
          if (!dateFilter.trim()) return true
          const userDate = new Date(user.createdAt).toISOString().split('T')[0]
          return userDate === dateFilter
        })()

        return matchesUserDetails && matchesRole && matchesStatus && matchesDate
      })
      .sort((a, b) => {
        let valA: any = a[sortField as keyof User] || ''
        let valB: any = b[sortField as keyof User] || ''

        if (sortField === 'createdAt') {
          valA = new Date(valA).getTime()
          valB = new Date(valB).getTime()
        }

        const modifier = sortOrder === 'asc' ? 1 : -1
        return valA > valB ? modifier : valA < valB ? -1 * modifier : 0
      })
  }, [initialUsers, searchValues, sortField, sortOrder])

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredAndSortedUsers.slice(start, start + pageSize)
  }, [filteredAndSortedUsers, currentPage, pageSize])

  // Column definitions passed to the reusable table
  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'User Details',
      sortable: true,
      filterable: true,
      filterType: 'text',
      renderCell: (user) => (
        <div className="flex items-center gap-3">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover border border-stone-200"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-xs border border-amber-200">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div>
            <div className="font-semibold text-stone-900 text-xs sm:text-sm">
              {user.name}
            </div>
            <div className="text-[11px] text-stone-500">{user.email}</div>
          </div>
        </div>
      ),
      renderMobileCard: (user) => (
        <div key={user.id} className="space-y-2.5 relative">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover border border-stone-200 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-sm border border-amber-200 shrink-0">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-stone-900 text-xs truncate">
                  {user.name}
                </div>
                <div className="text-[11px] text-stone-500 truncate">
                  {user.email}
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1">
              <span
                className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md border ${getRoleBadgeColor(
                  user.role,
                )}`}
              >
                {user.role || 'None'}
              </span>
              <UserActionsDropdown
                user={user}
                onOpen={handleDropdownOpen}
                onEdit={handleEditUser}
                onResendVerification={handleResendUser}
                onSuccess={handleDropdownSuccess}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-stone-100 text-stone-500">
            <span>Joined {formatDate(user.createdAt)}</span>
            <span
              className={
                user.banned
                  ? 'text-rose-600 font-semibold'
                  : user.emailVerified
                    ? 'text-emerald-600 font-semibold'
                    : 'text-stone-500'
              }
            >
              {user.banned
                ? 'Blocked'
                : user.emailVerified
                  ? 'Verified'
                  : 'Pending'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Role...', value: 'ALL' },
        { label: 'Owner', value: 'owner' },
        { label: 'Manager', value: 'manager' },
        { label: 'Receptionist', value: 'receptionist' },
      ],
      renderCell: (user) => (
        <span
          className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${getRoleBadgeColor(user.role)}`}
        >
          {user.role || 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: false,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Status...', value: 'ALL' },
        { label: 'Verified', value: 'verified' },
        { label: 'Pending', value: 'pending' },
        { label: 'Blocked', value: 'blocked' },
      ],
      renderCell: (user) => {
        if (user.banned) {
          return (
            <span className="inline-flex items-center gap-1.5 text-xs text-rose-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Blocked
            </span>
          )
        }
        return user.emailVerified ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-stone-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-stone-300" /> Pending
          </span>
        )
      },
    },
    {
      key: 'createdAt',
      header: 'Created Date',
      sortable: true,
      filterable: true,
      filterType: 'date',
      renderCell: (user) => (
        <span className="text-stone-600 text-xs">
          {formatDate(user.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      renderCell: (user) => (
        <UserActionsDropdown
          user={user}
          onOpen={handleDropdownOpen}
          onEdit={handleEditUser}
          onResendVerification={handleResendUser}
          onSuccess={handleDropdownSuccess}
        />
      ),
    },
  ]

  return (
    <>
      <AdminDataTable
        title="Users"
        data={paginatedUsers}
        columns={columns}
        keyField="id"
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        searchValues={searchValues}
        onSearchChange={handleSearchChange}
        onResetFilters={handleResetFilters}
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={filteredAndSortedUsers.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setCurrentPage(1)
        }}
        addLabel="Add User"
        onAddClick={() => setIsAddModalOpen(true)}
      />

      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => router.invalidate()}
      />

      <EditUserProfileModal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        onSuccess={() => router.invalidate()}
        user={editingUser as any}
      />
      <ResendVerificationModal
        isOpen={Boolean(resendTargetUser)}
        onClose={() => setResendTargetUser(null)}
        onSuccess={() => {
          router.invalidate()
        }}
        user={resendTargetUser as any}
      />
    </>
  )
}
