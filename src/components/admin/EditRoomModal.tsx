import { useState, useEffect } from 'react'
import { updateRoom, deleteRoom } from '#/server/room-actions'
import {
  X,
  Bed,
  Trash2,
  Upload,
  Maximize2,
  Sparkles,
  Check,
  AlertTriangle,
} from 'lucide-react'
import {
  ROOM_TYPES,
  ROOM_STATUSES,
  type RoomStatus,
  type RoomType,
} from '#/lib/constants/rooms'
import { AmenitySelectorModal } from './AmenitySelectorModal'

interface EditRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  room: {
    id: string
    roomNumber: string
    name: string
    type: string
    description?: string | null
    capacity: number
    pricePerNight: number | any
    status: string
    amenities: string[]
    images?: string[]
  } | null
}

export function EditRoomModal({
  isOpen,
  onClose,
  onSuccess,
  room,
}: EditRoomModalProps) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImagePreview, setSelectedImagePreview] = useState<
    string | null
  >(null)
  const [isAmenityModalOpen, setIsAmenityModalOpen] = useState(false)

  // 👇 State to control our clean custom delete confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [formData, setFormData] = useState({
    roomNumber: '',
    name: '',
    type: 'Standard' as RoomType,
    description: '',
    capacity: 2,
    pricePerNight: 2500,
    status: 'AVAILABLE' as RoomStatus,
    amenities: [] as string[],
    images: [] as string[],
  })

  useEffect(() => {
    if (room) {
      setFormData({
        roomNumber: room.roomNumber || '',
        name: room.name || '',
        type: (room.type as RoomType) || 'Standard',
        description: room.description || '',
        capacity: room.capacity || 2,
        pricePerNight: room.pricePerNight ? Number(room.pricePerNight) : 0,
        status: (room.status as RoomStatus) || 'AVAILABLE',
        amenities: room.amenities || [],
        images: room.images || [],
      })
      setError(null)
      setShowDeleteConfirm(false)
    }
  }, [room])

  if (!isOpen || !room) return null

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setError('Please upload valid image files (JPG, PNG, WEBP).')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file size must be less than 5MB.')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, reader.result as string],
        }))
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const handleRemoveImage = (indexToRemove: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await updateRoom({
        data: {
          id: room.id,
          roomNumber: formData.roomNumber,
          name: formData.name,
          type: formData.type,
          description: formData.description || undefined,
          capacity: Number(formData.capacity),
          pricePerNight: Number(formData.pricePerNight),
          status: formData.status as any,
          amenities: formData.amenities,
          images: formData.images,
        },
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update room.')
    } finally {
      setLoading(false)
    }
  }

  // 👇 Executed when clicking "Confirm Delete" in our custom popup
  const handleDeleteConfirm = async () => {
    setDeleting(true)
    setError(null)

    try {
      await deleteRoom({ data: { id: room.id } })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to delete room.')
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-stone-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-100 p-5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center border border-amber-200">
                <Bed className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Edit Room {room.roomNumber}
                </h3>
                <p className="text-xs text-stone-500">
                  Update availability, rates, photos, or amenities
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Photos Gallery */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-semibold text-stone-700">
                    Room Photos & Gallery ({formData.images.length})
                  </label>
                  <span className="text-[10px] text-stone-400">
                    Scroll horizontally ➔
                  </span>
                </div>

                <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 px-1">
                  <label className="border-2 border-dashed border-stone-200 hover:border-amber-600 hover:bg-amber-50/50 rounded-xl w-20 h-20 shrink-0 flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-amber-800 cursor-pointer transition p-2 text-center">
                    <Upload className="w-4 h-4" />
                    <span className="text-[10px] font-semibold">Add Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>

                  {formData.images.map((imgUrl, index) => (
                    <div
                      key={index}
                      className="relative group w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 shadow-2xs"
                    >
                      <img
                        src={imgUrl}
                        alt={`Room photo ${index + 1}`}
                        className="w-full h-full object-cover cursor-pointer transition group-hover:scale-105"
                        onClick={() => setSelectedImagePreview(imgUrl)}
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedImagePreview(imgUrl)}
                        className="absolute bottom-1 left-1 p-1 bg-stone-900/60 hover:bg-stone-900 text-white rounded-md transition opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 p-1 bg-stone-900/70 hover:bg-rose-600 text-white rounded-lg transition opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Room Number / Identifier
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.roomNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, roomNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as RoomStatus,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800 bg-white"
                  >
                    {ROOM_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Room Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as RoomType,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800 bg-white"
                  >
                    {ROOM_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Price Per Night (₱)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="50"
                    required
                    value={formData.pricePerNight}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pricePerNight: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Capacity (Guests)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  required
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capacity: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800 resize-none"
                />
              </div>

              {/* Amenities Section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-semibold text-stone-700">
                    Resort Amenities ({formData.amenities.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAmenityModalOpen(true)}
                    className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer transition hover:underline"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Manage Amenities
                  </button>
                </div>

                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                  {formData.amenities.length === 0 ? (
                    <p className="text-stone-400 text-xs italic">
                      No amenities selected.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {formData.amenities.map((item) => (
                        <span
                          key={item}
                          className="px-2.5 py-1 bg-white border border-stone-200 text-stone-800 font-semibold text-[11px] rounded-lg shadow-2xs flex items-center gap-1"
                        >
                          <Check className="w-3 h-3 text-amber-800" />
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-stone-100 bg-white rounded-b-2xl shrink-0">
              <button
                type="button"
                disabled={deleting || loading}
                onClick={() => setShowDeleteConfirm(true)} // 👈 Opens our clean custom modal popup
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition text-xs"
              >
                <Trash2 className="w-4 h-4" /> Delete Room
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={loading || deleting}
                  onClick={onClose}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl cursor-pointer transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || deleting}
                  className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-xl shadow-md cursor-pointer transition disabled:opacity-50 text-xs"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* 👇 Custom Styled Delete Confirmation Popup Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-70 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-stone-900">
                Archive Room {room.roomNumber}?
              </h4>
              <p className="text-xs text-stone-500 mt-1">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-stone-800">
                  "{room.name}"
                </span>
                ? You can restore it later from the archived rooms list.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl cursor-pointer transition text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-md cursor-pointer transition text-xs disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AmenitySelectorModal
        isOpen={isAmenityModalOpen}
        onClose={() => setIsAmenityModalOpen(false)}
        selectedAmenities={formData.amenities}
        onSave={(newAmenities) =>
          setFormData((prev) => ({ ...prev, amenities: newAmenities }))
        }
      />

      {selectedImagePreview && (
        <div
          className="fixed inset-0 bg-black/90 z-80 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedImagePreview(null)}
        >
          <button
            onClick={() => setSelectedImagePreview(null)}
            className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedImagePreview}
            alt="Fullscreen Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
