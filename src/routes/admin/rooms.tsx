import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '#/lib/auth'
import { hasPermission } from '#/lib/permissions'
import { getRoomsList } from '#/server/room-actions'
import { useState, useMemo } from 'react'
import { AdminDataTable, type Column } from '#/components/admin/AdminDataTable'
import { Bed, Users, CheckCircle2, Wrench, Sparkles } from 'lucide-react'
import { AddRoomModal } from '#/components/admin/AddRoomModal'
import { EditRoomModal } from '#/components/admin/EditRoomModal'

const checkAccess = createServerFn({ method: 'GET' }).handler(async () => {
  const { getRequestHeaders } = await import('@tanstack/react-start/server')
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  return session?.user ?? null
})

export const Route = createFileRoute('/admin/rooms')({
  beforeLoad: async () => {
    const user = await checkAccess()
    if (!user) throw redirect({ to: '/admin/login' })
    if (!hasPermission(user as any, 'view:rooms'))
      throw redirect({ to: '/admin' })
  },
  loader: async () => await getRoomsList(),
  component: AdminRoomsPage,
})

type Room = Awaited<ReturnType<typeof getRoomsList>>[number]
type SortField = 'roomNumber' | 'type' | 'pricePerNight'
type SortOrder = 'asc' | 'desc'

function getStatusBadge(status: string) {
  switch (status) {
    case 'AVAILABLE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5" /> Available
        </span>
      )
    case 'OCCUPIED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
          <Users className="w-3.5 h-3.5" /> Occupied
        </span>
      )
    case 'MAINTENANCE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
          <Wrench className="w-3.5 h-3.5" /> Maintenance
        </span>
      )
    case 'CLEANING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
          <Sparkles className="w-3.5 h-3.5" /> Cleaning
        </span>
      )
    default:
      return null
  }
}

function AdminRoomsPage() {
  const initialRooms = Route.useLoaderData()
  const router = useRouter()

  const [searchValues, setSearchValues] = useState<Record<string, string>>({
    roomNumber: '',
    type: 'ALL',
    status: 'ALL',
  })

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('roomNumber')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  const handleSort = (field: string) => {
    const typedField = field as SortField
    if (sortField === typedField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(typedField)
      setSortOrder('asc')
    }
  }

  const filteredAndSortedRooms = useMemo(() => {
    return initialRooms
      .filter((room) => {
        const search = searchValues.roomNumber?.toLowerCase() || ''
        const matchesSearch =
          !search ||
          room.roomNumber.toLowerCase().includes(search) ||
          room.name.toLowerCase().includes(search)

        const matchesType =
          searchValues.type === 'ALL' ||
          room.type.toLowerCase() === searchValues.type.toLowerCase()

        const matchesStatus =
          searchValues.status === 'ALL' || room.status === searchValues.status

        return matchesSearch && matchesType && matchesStatus
      })
      .sort((a, b) => {
        let valA: any = a[sortField]
        let valB: any = b[sortField]

        if (typeof valA === 'string') {
          valA = valA.toLowerCase()
          valB = valB.toLowerCase()
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1
        return 0
      })
  }, [initialRooms, searchValues, sortField, sortOrder])

  const paginatedRooms = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredAndSortedRooms.slice(start, start + pageSize)
  }, [filteredAndSortedRooms, currentPage, pageSize])

  const columns: Column<Room>[] = [
    {
      key: 'roomNumber',
      header: 'Room',
      sortable: true,
      renderCell: (room) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 font-bold flex items-center justify-center shrink-0 border border-amber-200">
            <Bed className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-stone-900 text-sm">
              {room.roomNumber}
            </div>
            <div className="text-xs text-stone-500">{room.name}</div>
          </div>
        </div>
      ),
      renderMobileCard: (room) => (
        <div key={room.id} className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 font-bold flex items-center justify-center shrink-0 border border-amber-200">
                <Bed className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-stone-900 text-xs truncate">
                  {room.roomNumber} - {room.name}
                </div>
                <div className="text-[11px] text-amber-900 font-semibold">
                  ₱{room.pricePerNight.toLocaleString()} / night
                </div>
              </div>
            </div>
            <button
              onClick={() => setEditingRoom(room)}
              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold rounded-lg transition shrink-0 cursor-pointer"
            >
              Edit
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-stone-100">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
              {room.type} ({room.capacity} Guests)
            </span>
            <span>{getStatusBadge(room.status)}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      renderCell: (room) => (
        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
          {room.type}
        </span>
      ),
    },
    {
      key: 'capacity',
      header: 'Capacity',
      renderCell: (room) => (
        <span className="text-xs text-stone-700 font-medium">
          {room.capacity} Guests
        </span>
      ),
    },
    {
      key: 'pricePerNight',
      header: 'Price / Night',
      sortable: true,
      renderCell: (room) => (
        <span className="font-bold text-xs text-amber-900">
          ₱{room.pricePerNight.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      renderCell: (room) => getStatusBadge(room.status),
    },
    {
      key: 'actions',
      header: 'Actions',
      renderCell: (room) => (
        <button
          onClick={() => setEditingRoom(room)}
          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition cursor-pointer"
        >
          Edit
        </button>
      ),
    },
  ]

  return (
    <>
      <AdminDataTable
        title="Rooms"
        data={paginatedRooms}
        columns={columns}
        keyField="id"
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        searchValues={searchValues}
        onSearchChange={(key, val) => {
          setSearchValues((prev) => ({ ...prev, [key]: val }))
          setCurrentPage(1)
        }}
        onResetFilters={() => {
          setSearchValues({ roomNumber: '', type: 'ALL', status: 'ALL' })
          setSortField('roomNumber')
          setSortOrder('asc')
          setCurrentPage(1)
        }}
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={filteredAndSortedRooms.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setCurrentPage(1)
        }}
        addLabel="Add Room"
        onAddClick={() => setIsAddModalOpen(true)}
      />
      <AddRoomModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => router.invalidate()}
      />
      <EditRoomModal
        isOpen={Boolean(editingRoom)}
        onClose={() => setEditingRoom(null)}
        onSuccess={() => router.invalidate()}
        room={editingRoom}
      />
    </>
  )
}
