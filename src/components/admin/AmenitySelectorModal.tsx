import { useState, useEffect } from 'react' // 👈 1. Import useEffect
import { X, Check, Search, Sparkles } from 'lucide-react'
import { RESORT_AMENITY_CATEGORIES } from '#/lib/constants/rooms'

interface AmenitySelectorModalProps {
  isOpen: boolean
  onClose: () => void
  selectedAmenities: string[]
  onSave: (amenities: string[]) => void
}

export function AmenitySelectorModal({
  isOpen,
  onClose,
  selectedAmenities,
  onSave,
}: AmenitySelectorModalProps) {
  const [tempSelected, setTempSelected] = useState<string[]>(selectedAmenities)
  const [searchQuery, setSearchQuery] = useState('')

  // 👈 2. Add this useEffect to sync selected amenities whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedAmenities || [])
      setSearchQuery('')
    }
  }, [isOpen, selectedAmenities])

  if (!isOpen) return null

  const handleToggle = (amenity: string) => {
    setTempSelected((prev) =>
      prev.includes(amenity)
        ? prev.filter((item) => item !== amenity)
        : [...prev, amenity],
    )
  }

  const handleSelectAllCategory = (items: readonly string[]) => {
    const allSelected = items.every((item) => tempSelected.includes(item))
    if (allSelected) {
      setTempSelected((prev) => prev.filter((item) => !items.includes(item)))
    } else {
      setTempSelected((prev) => Array.from(new Set([...prev, ...items])))
    }
  }

  const handleApply = () => {
    onSave(tempSelected)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-60 p-4 sm:p-6">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 p-5 bg-stone-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center border border-amber-200 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">
                Select Resort Amenities
              </h3>
              <p className="text-xs text-stone-500">
                Check off all available amenities for this room (
                {tempSelected.length} selected)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Filter */}
            <div className="relative w-64 hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                placeholder="Search amenities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              />
            </div>

            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-200/60 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Categories Grid */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {RESORT_AMENITY_CATEGORIES.map((group) => {
              const filteredItems = group.items.filter((item) =>
                item.toLowerCase().includes(searchQuery.toLowerCase()),
              )

              if (searchQuery && filteredItems.length === 0) return null

              const isAllCatSelected = group.items.every((item) =>
                tempSelected.includes(item),
              )

              return (
                <div
                  key={group.category}
                  className={`rounded-2xl border ${group.borderColor} bg-white overflow-hidden shadow-2xs flex flex-col`}
                >
                  {/* Category Banner */}
                  <div
                    className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider flex items-center justify-between ${group.headerBg}`}
                  >
                    <span>{group.category}</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllCategory(group.items)}
                      className="text-[10px] font-semibold underline underline-offset-2 opacity-90 hover:opacity-100 cursor-pointer"
                    >
                      {isAllCatSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {/* Amenities List */}
                  <div className="p-3 space-y-1">
                    {filteredItems.map((amenity) => {
                      const isChecked = tempSelected.includes(amenity)
                      return (
                        <label
                          key={amenity}
                          onClick={() => handleToggle(amenity)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer select-none text-xs transition ${
                            isChecked
                              ? 'bg-amber-50/70 text-amber-950 font-semibold'
                              : 'hover:bg-stone-50 text-stone-700'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center transition shrink-0 ${
                              isChecked
                                ? 'bg-amber-800 border-amber-800 text-white'
                                : 'border-stone-300 bg-white'
                            }`}
                          >
                            {isChecked && (
                              <Check className="w-3 h-3 stroke-[3]" />
                            )}
                          </div>
                          <span>{amenity}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="flex items-center justify-between p-4 border-t border-stone-100 bg-stone-50/50 shrink-0">
          <div className="text-xs text-stone-600 font-medium">
            Total Selected:{' '}
            <span className="font-bold text-amber-900">
              {tempSelected.length}
            </span>{' '}
            amenities
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-200/80 hover:bg-stone-200 text-stone-700 font-medium rounded-xl cursor-pointer transition text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-xl shadow-md cursor-pointer transition text-xs"
            >
              Apply Amenities
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
