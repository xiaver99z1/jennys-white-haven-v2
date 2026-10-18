import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { getRoomsList, restoreRoom } from '#/server/room-actions'
import { AddRoomModal } from '#/components/admin/AddRoomModal'
import { EditRoomModal } from '#/components/admin/EditRoomModal'
import {
  Plus,
  Search,
  Bed,
  Users,
  Archive,
  RotateCcw,
  Edit,
  CheckCircle2,
  AlertCircle,
  Building2,
  Sparkles,
} from 'lucide-react'

export const Route = createFileRoute('/admin/rooms')({
  loader: async () => {
    // Fetch both active and archived rooms if needed, or fetch active by default
    const rooms = await getRoomsList()
    return { rooms }
  },
  component: AdminRoomsPage,
})

function AdminRoomsPage() {
  const { rooms: initialRooms } = Route.useLoaderData()
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<any | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  // Filter rooms based on search, type, and archived status
  const filteredRooms = initialRooms.filter((room: any) => {
    const matchesArchived = showArchived
      ? room.deletedAt !== null
      : room.deletedAt === null
    const matchesSearch =
      room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.type.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType =
      selectedTypeFilter === 'ALL' || room.type === selectedTypeFilter

    return matchesArchived && matchesSearch && matchesType
  })

  const handleRestore = async (roomId: string, roomNumber: string) => {
    if (!confirm(`Restore Room "${roomNumber}" back to active rooms?`)) return
    setRestoringId(roomId)
    try {
      await restoreRoom({ data: { id: roomId } })
      router.invalidate()
    } catch (err: any) {
      alert(err.message || 'Failed to restore room.')
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Rooms Management
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage room inventories, pricing, photo galleries, and amenities
            checklists.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle Archived Rooms */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              showArchived
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
            }`}
          >
            <Archive className="w-4 h-4" />
            {showArchived ? 'View Rooms' : 'View Archived Rooms'}
          </button>
          {/* Add Room Button */}
          {!showArchived && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer text-xs"
            >
              <Plus className="w-4 h-4" />
              Add Room
            </button>
          )}
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
          <input
            type="text"
            placeholder="Search by room number, name, type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800"
          />
        </div>

        {/* Type Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['ALL', 'Standard', 'Deluxe', 'Suite', 'Villa'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedTypeFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                selectedTypeFilter === type
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Rooms Table / Grid */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {filteredRooms.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-800">No rooms found</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {showArchived
                ? 'No archived or soft-deleted rooms match your filters.'
                : 'Get started by adding your first room.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/70 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Room & Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Price / Night</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Amenities</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                {filteredRooms.map((room: any) => (
                  <tr key={room.id} className="hover:bg-stone-50/50 transition">
                    {/* Room Number & Name with Image Thumbnail */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                          {room.images && room.images.length > 0 ? (
                            <img
                              src={room.images[0]}
                              alt={room.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-400">
                              <Bed className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-stone-900">
                            {room.roomNumber}
                          </div>
                          <div className="text-stone-500 text-[11px]">
                            {room.name}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4 font-semibold text-stone-800">
                      <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 border border-stone-200 text-[11px]">
                        {room.type}
                      </span>
                    </td>

                    {/* Capacity */}
                    <td className="py-3 px-4 font-medium">
                      <div className="flex items-center gap-1 text-stone-600">
                        <Users className="w-3.5 h-3.5 text-stone-400" />
                        <span>{room.capacity} Guests</span>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 font-bold text-amber-900">
                      ₱{Number(room.pricePerNight).toLocaleString()}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {showArchived ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertCircle className="w-3 h-3" /> Archived
                        </span>
                      ) : room.status === 'AVAILABLE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertCircle className="w-3 h-3" /> {room.status}
                        </span>
                      )}
                    </td>

                    {/* Amenities Count */}
                    <td className="py-3 px-4">
                      <span className="text-stone-600 font-medium">
                        {room.amenities?.length || 0} amenities
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      {showArchived ? (
                        <button
                          onClick={() =>
                            handleRestore(room.id, room.roomNumber)
                          }
                          disabled={restoringId === room.id}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl text-xs inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 ml-auto"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {restoringId === room.id
                            ? 'Restoring...'
                            : 'Restore Room'}
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingRoom(room)}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-xs inline-flex items-center gap-1.5 transition cursor-pointer ml-auto"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit Room
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Room Modal */}
      <AddRoomModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => router.invalidate()}
      />

      {/* Edit Room Modal */}
      <EditRoomModal
        isOpen={Boolean(editingRoom)}
        onClose={() => setEditingRoom(null)}
        onSuccess={() => router.invalidate()}
        room={editingRoom}
      />
    </div>
  )
}
