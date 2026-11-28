import { useState, useRef } from 'react'
import { createRoom } from '#/server/room-actions'
import { X, Bed, Upload, Maximize2, Sparkles, Check } from 'lucide-react'
import { FieldError, getFieldValidationClass } from '#/components/common/FormFieldError'
import {
  DEFAULT_EXTRA_CHILD_FEE,
  DEFAULT_EXTRA_PERSON_FEE,
  DEFAULT_WHOLE_HOUSE_PRICE,
  ROOM_TYPES,
} from '#/lib/constants/rooms'
import type { RoomType } from '#/lib/constants/rooms'
import { AmenitySelectorModal } from './AmenitySelectorModal'
import {
  compressImageForUpload,
  IMAGE_UPLOAD_PRESETS,
} from '#/lib/image-compress'
import {
  hasFieldErrors,
  validateIntegerField,
  validateMoneyField,
  validateRoomDisplayNameField,
  validateRoomNumberField,
  validateTextField,
} from '#/lib/validation'

interface AddRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type RoomFieldErrors = Partial<
  Record<
    | 'roomNumber'
    | 'name'
    | 'capacity'
    | 'pricePerNight'
    | 'extraPersonFee'
    | 'extraChildFee'
    | 'description',
    string | null
  >
>

const ROOM_INPUT_CLASS =
  'w-full px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-800'

export function AddRoomModal({
  isOpen,
  onClose,
  onSuccess,
}: AddRoomModalProps) {
  const [loading, setLoading] = useState(false)
  const [pendingUploads, setPendingUploads] = useState(0)
  const draftEpochRef = useRef(0)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<RoomFieldErrors>({})
  const [selectedImagePreview, setSelectedImagePreview] = useState<
    string | null
  >(null)

  // Controls state for the new separate Amenity Modal
  const [isAmenityModalOpen, setIsAmenityModalOpen] = useState(false)

  const [formData, setFormData] = useState({
    roomNumber: '',
    name: '',
    type: 'Standard' as RoomType,
    description: '',
    capacity: 2,
    pricePerNight: 2500,
    extraPersonFee: DEFAULT_EXTRA_PERSON_FEE,
    extraChildFee: DEFAULT_EXTRA_CHILD_FEE,
    amenities: [
      'Wi-Fi',
      'Air conditioning / heating',
      'Towels (bath, hand, face)',
    ] as string[],
    images: [] as string[],
  })

  if (!isOpen) return null

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

      const uploadEpoch = draftEpochRef.current
      setPendingUploads((count) => count + 1)

      void compressImageForUpload(
        file,
        IMAGE_UPLOAD_PRESETS.room.maxDimension,
        IMAGE_UPLOAD_PRESETS.room.quality,
      ).then((compressedFile) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          if (draftEpochRef.current === uploadEpoch) {
            setFormData((prev) => ({
              ...prev,
              images: [...prev.images, reader.result as string],
            }))
            setPendingUploads((count) => Math.max(0, count - 1))
          }
        }
        reader.readAsDataURL(compressedFile)
      })
    })
    e.target.value = ''
  }

  const handleRemoveImage = (indexToRemove: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove),
    }))
  }

  const validateAllFields = (): RoomFieldErrors => ({
    roomNumber: validateRoomNumberField(formData.roomNumber),
    name: validateRoomDisplayNameField(formData.name),
    capacity: validateIntegerField(Number(formData.capacity), {
      label: 'Capacity',
      min: 1,
      max: 30,
    }),
    pricePerNight: validateMoneyField(Number(formData.pricePerNight), {
      label: 'Price per night',
      min: 0,
      allowZero: true,
    }),
    extraPersonFee: validateMoneyField(Number(formData.extraPersonFee), {
      label: 'Extra adult fee',
      min: 0,
      allowZero: true,
    }),
    extraChildFee: validateMoneyField(Number(formData.extraChildFee), {
      label: 'Extra child fee',
      min: 0,
      allowZero: true,
    }),
    description: validateTextField(formData.description, {
      label: 'Description',
      required: false,
      maxLength: 1000,
    }),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const nextErrors = validateAllFields()
    setFieldErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) {
      return
    }
    setLoading(true)

    try {
      await createRoom({
        data: {
          roomNumber: formData.roomNumber.trim(),
          name: formData.name.trim(),
          type: formData.type,
          description: formData.description.trim() || undefined,
          capacity: Number(formData.capacity),
          pricePerNight: Number(formData.pricePerNight),
          extraPersonFee: Number(formData.extraPersonFee),
          extraChildFee: Number(formData.extraChildFee),
          amenities: formData.amenities,
          images: formData.images,
        },
      })

      draftEpochRef.current += 1
      setPendingUploads(0)
      setFieldErrors({})
      setFormData({
        roomNumber: '',
        name: '',
        type: 'Standard',
        description: '',
        capacity: 2,
        pricePerNight: 2500,
        extraPersonFee: DEFAULT_EXTRA_PERSON_FEE,
        extraChildFee: DEFAULT_EXTRA_CHILD_FEE,
        amenities: [
          'Wi-Fi',
          'Air conditioning / heating',
          'Towels (bath, hand, face)',
        ],
        images: [],
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create room.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAmenities = (newAmenities: string[]) => {
    setFormData((prev) => ({ ...prev, amenities: newAmenities }))
  }

  const handlePreview = (url: string) => {
    setSelectedImagePreview(url)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
        {/* Main Modal Container */}
        <div className="bg-white rounded-2xl max-w-xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-stone-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-100 p-5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center border border-amber-200">
                <Bed className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Add New Room
                </h3>
                <p className="text-xs text-stone-500">
                  Configure room details, pricing, and amenities
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
            noValidate
            className="flex flex-col flex-1 overflow-hidden"
          >
            {/* Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Photos Gallery Slider */}
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
                        onClick={() => handlePreview(imgUrl)}
                      />
                      <button
                        type="button"
                        onClick={() => handlePreview(imgUrl)}
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
                  <label
                    htmlFor="add-room-number"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Room Number / Identifier
                  </label>
                  <input
                    id="add-room-number"
                    type="text"
                    required
                    data-testid="room-number-input"
                    placeholder="e.g. 101"
                    value={formData.roomNumber}
                    onChange={(e) => {
                      const next = e.target.value
                      setFormData({ ...formData, roomNumber: next })
                      if (fieldErrors.roomNumber) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          roomNumber: validateRoomNumberField(next),
                        }))
                      }
                    }}
                    onBlur={() =>
                      setFieldErrors((prev) => ({
                        ...prev,
                        roomNumber: validateRoomNumberField(formData.roomNumber),
                      }))
                    }
                    aria-invalid={Boolean(fieldErrors.roomNumber)}
                    className={getFieldValidationClass(
                      ROOM_INPUT_CLASS,
                      Boolean(fieldErrors.roomNumber),
                    )}
                  />
                  <FieldError message={fieldErrors.roomNumber} />
                </div>
                <div>
                  <label
                    htmlFor="add-room-type"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Room Type
                  </label>
                  <select
                    id="add-room-type"
                    value={formData.type}
                    onChange={(e) => {
                      const nextType = e.target.value as RoomType
                      setFormData((prev) => ({
                        ...prev,
                        type: nextType,
                        pricePerNight:
                          nextType === 'Whole House'
                            ? DEFAULT_WHOLE_HOUSE_PRICE
                            : prev.type === 'Whole House' &&
                                prev.pricePerNight === DEFAULT_WHOLE_HOUSE_PRICE
                              ? 2500
                              : prev.pricePerNight,
                      }))
                    }}
                    className={`${ROOM_INPUT_CLASS} bg-white`}
                  >
                    {ROOM_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="add-room-name"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Room Display Name
                </label>
                <input
                  id="add-room-name"
                  type="text"
                  required
                  data-testid="room-name-input"
                  placeholder="e.g. Deluxe Ocean View Suite"
                  value={formData.name}
                  onChange={(e) => {
                    const next = e.target.value
                    setFormData({ ...formData, name: next })
                    if (fieldErrors.name) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        name: validateRoomDisplayNameField(next),
                      }))
                    }
                  }}
                  onBlur={() =>
                    setFieldErrors((prev) => ({
                      ...prev,
                      name: validateRoomDisplayNameField(formData.name),
                    }))
                  }
                  aria-invalid={Boolean(fieldErrors.name)}
                  className={getFieldValidationClass(
                    ROOM_INPUT_CLASS,
                    Boolean(fieldErrors.name),
                  )}
                />
                <FieldError message={fieldErrors.name} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div>
                  <label
                    htmlFor="add-room-capacity"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Capacity (Guests)
                  </label>
                  <input
                    id="add-room-capacity"
                    type="number"
                    min={1}
                    max={30}
                    required
                    value={formData.capacity}
                    onChange={(e) => {
                      const next = Number(e.target.value)
                      setFormData({
                        ...formData,
                        capacity: next,
                      })
                      if (fieldErrors.capacity) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          capacity: validateIntegerField(next, {
                            label: 'Capacity',
                            min: 1,
                            max: 30,
                          }),
                        }))
                      }
                    }}
                    aria-invalid={Boolean(fieldErrors.capacity)}
                    className={getFieldValidationClass(
                      ROOM_INPUT_CLASS,
                      Boolean(fieldErrors.capacity),
                    )}
                  />
                  <FieldError message={fieldErrors.capacity} />
                </div>
                <div>
                  <label
                    htmlFor="add-room-price"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Price / Night (₱)
                  </label>
                  <input
                    id="add-room-price"
                    type="number"
                    min={0}
                    step="50"
                    placeholder="0"
                    value={formData.pricePerNight === 0 ? '' : formData.pricePerNight}
                    onChange={(e) => {
                      const next = Number(e.target.value) || 0
                      setFormData({
                        ...formData,
                        pricePerNight: next,
                      })
                      if (fieldErrors.pricePerNight) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          pricePerNight: validateMoneyField(next, {
                            label: 'Price per night',
                            min: 0,
                            allowZero: true,
                          }),
                        }))
                      }
                    }}
                    aria-invalid={Boolean(fieldErrors.pricePerNight)}
                    className={getFieldValidationClass(
                      ROOM_INPUT_CLASS,
                      Boolean(fieldErrors.pricePerNight),
                    )}
                  />
                  <FieldError message={fieldErrors.pricePerNight} />
                </div>
                <div>
                  <label
                    htmlFor="add-room-extra-adult"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Extra Adult (₱/n)
                  </label>
                  <input
                    id="add-room-extra-adult"
                    type="number"
                    min={0}
                    step="50"
                    placeholder="0"
                    value={formData.extraPersonFee === 0 ? '' : formData.extraPersonFee}
                    onChange={(e) => {
                      const next = Number(e.target.value) || 0
                      setFormData({
                        ...formData,
                        extraPersonFee: next,
                      })
                      if (fieldErrors.extraPersonFee) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          extraPersonFee: validateMoneyField(next, {
                            label: 'Extra adult fee',
                            min: 0,
                            allowZero: true,
                          }),
                        }))
                      }
                    }}
                    aria-invalid={Boolean(fieldErrors.extraPersonFee)}
                    className={getFieldValidationClass(
                      ROOM_INPUT_CLASS,
                      Boolean(fieldErrors.extraPersonFee),
                    )}
                  />
                  <FieldError message={fieldErrors.extraPersonFee} />
                </div>
                <div>
                  <label
                    htmlFor="add-room-extra-child"
                    className="block font-semibold text-stone-700 mb-1"
                  >
                    Extra Child (₱/n)
                  </label>
                  <input
                    id="add-room-extra-child"
                    type="number"
                    min={0}
                    step="50"
                    placeholder="0"
                    value={formData.extraChildFee === 0 ? '' : formData.extraChildFee}
                    onChange={(e) => {
                      const next = Number(e.target.value) || 0
                      setFormData({
                        ...formData,
                        extraChildFee: next,
                      })
                      if (fieldErrors.extraChildFee) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          extraChildFee: validateMoneyField(next, {
                            label: 'Extra child fee',
                            min: 0,
                            allowZero: true,
                          }),
                        }))
                      }
                    }}
                    aria-invalid={Boolean(fieldErrors.extraChildFee)}
                    className={getFieldValidationClass(
                      ROOM_INPUT_CLASS,
                      Boolean(fieldErrors.extraChildFee),
                    )}
                  />
                  <FieldError message={fieldErrors.extraChildFee} />
                </div>
              </div>

              <div>
                <label
                  htmlFor="add-room-description"
                  className="block font-semibold text-stone-700 mb-1"
                >
                  Description (Optional)
                </label>
                <textarea
                  id="add-room-description"
                  rows={2}
                  maxLength={1000}
                  placeholder="Brief description of the room..."
                  value={formData.description}
                  onChange={(e) => {
                    const next = e.target.value
                    setFormData({ ...formData, description: next })
                    if (fieldErrors.description) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        description: validateTextField(next, {
                          label: 'Description',
                          required: false,
                          maxLength: 1000,
                        }),
                      }))
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.description)}
                  className={getFieldValidationClass(
                    `${ROOM_INPUT_CLASS} resize-none`,
                    Boolean(fieldErrors.description),
                  )}
                />
                <FieldError message={fieldErrors.description} />
              </div>

              {/* Clean Amenities Summary Card with Trigger Button */}
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
                      No amenities selected yet.
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

            {/* Fixed Sticky Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-stone-100 bg-white rounded-b-2xl shrink-0">
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl cursor-pointer transition text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || pendingUploads > 0}
                className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-xl shadow-md cursor-pointer transition disabled:opacity-50 text-xs"
              >
                {loading ? 'Creating...' : 'Create Room'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Separate Amenity Selection Modal */}
      <AmenitySelectorModal
        isOpen={isAmenityModalOpen}
        onClose={() => setIsAmenityModalOpen(false)}
        selectedAmenities={formData.amenities}
        onSave={handleSaveAmenities}
      />

      {/* Lightbox Preview Modal */}
      {selectedImagePreview && (
        <div
          className="fixed inset-0 bg-black/90 z-70 flex items-center justify-center p-4 backdrop-blur-sm"
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
