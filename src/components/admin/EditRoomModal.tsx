import { useState, useEffect } from 'react'
import { updateRoom, deleteRoom } from '#/server/room-actions'
import { X, Bed, Trash2, Plus, Check, Upload, Maximize2 } from 'lucide-react'
import {
  ROOM_TYPES,
  ROOM_STATUSES,
  RESORT_AMENITY_PRESETS,
  type RoomStatus,
  type RoomType,
} from '#/lib/constants/resort'

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
    pricePerNight: number
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

  // Lightbox modal state for large image view
  const [selectedImagePreview, setSelectedImagePreview] = useState<
    string | null
  >(null)

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

  // Sync form state when a room is selected
  useEffect(() => {
    if (room) {
      setFormData({
        roomNumber: room.roomNumber || '',
        name: room.name || '',
        type: (room.type as RoomType) || 'Standard',
        description: room.description || '',
        capacity: room.capacity || 2,
        pricePerNight: room.pricePerNight || 0,
        status: (room.status as RoomStatus) || 'AVAILABLE',
        amenities: room.amenities || [],
        images: room.images || [],
      })
      setError(null)
    }
  }, [room])

  if (!isOpen || !room) return null

  // Image Upload Handlers
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

  const handleToggleAmenity = (amenity: string) => {
    setFormData((prev) => {
      const exists = prev.amenities.includes(amenity)
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== amenity)
          : [...prev.amenities, amenity],
      }
    })
  }

  // Update room handler
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

  // Delete room handler
  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete Room "${room.roomNumber}"? This cannot be undone.`,
      )
    )
      return
    setDeleting(true)
    setError(null)

    try {
      await deleteRoom({ data: { id: room.id } })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to delete room.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Main Edit Modal */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 my-8">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center border border-amber-200">
                <Bed className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Edit Room {room.roomNumber}
                </h3>
                <p className="text-xs text-stone-500">
                  Update availability, rates, or amenities
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

          {/* Error Alert */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Room Photos Slider & Gallery */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-semibold text-stone-700">
                  Room Photos & Gallery ({formData.images.length})
                </label>
                <span className="text-[10px] text-stone-400">
                  Scroll horizontally ➔
                </span>
              </div>

              {/* Horizontal Slider Container */}
              <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 px-1 scrollbar-thin scrollbar-thumb-stone-200">
                {/* Upload Button Card */}
                <label className="border-2 border-dashed border-stone-200 hover:border-amber-600 hover:bg-amber-50/50 rounded-xl w-24 h-24 shrink-0 flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-amber-800 cursor-pointer transition p-2 text-center">
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

                {/* Existing Images in Slider */}
                {formData.images.map((imgUrl, index) => (
                  <div
                    key={index}
                    className="relative group w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-stone-200 bg-stone-100 shadow-2xs"
                  >
                    <img
                      src={imgUrl}
                      alt={`Room photo ${index + 1}`}
                      className="w-full h-full object-cover cursor-pointer transition group-hover:scale-105"
                      onClick={() => setSelectedImagePreview(imgUrl)}
                    />

                    {/* Expand / Lightbox Trigger Overlay */}
                    <button
                      type="button"
                      onClick={() => setSelectedImagePreview(imgUrl)}
                      className="absolute bottom-1 left-1 p-1 bg-stone-900/60 hover:bg-stone-900 text-white rounded-md transition opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="View Fullscreen"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>

                    {/* Delete Image Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 p-1 bg-stone-900/70 hover:bg-rose-600 text-white rounded-lg transition opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Remove Photo"
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
                  setFormData({ ...formData, capacity: Number(e.target.value) })
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

            {/* Quick-Select Amenity Grid */}
            <div>
              <label className="block font-semibold text-stone-700 mb-1.5">
                Resort Amenities
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-stone-50 rounded-xl border border-stone-100">
                {RESORT_AMENITY_PRESETS.map((preset) => {
                  const isSelected = formData.amenities.includes(preset)
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleToggleAmenity(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-amber-800 text-white shadow-2xs'
                          : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      {preset}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-stone-100">
              <button
                type="button"
                disabled={deleting || loading}
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition text-xs"
              >
                <Trash2 className="w-4 h-4" />{' '}
                {deleting ? 'Deleting...' : 'Delete Room'}
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

      {/* Lightbox Modal (Fullscreen Image Preview Popup) */}
      {selectedImagePreview && (
        <div
          className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
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
