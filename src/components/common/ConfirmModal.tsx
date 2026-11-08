import { AlertCircle, RotateCcw } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  variant?: 'danger' | 'success' | 'amber'
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  variant = 'success',
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  if (!isOpen) return null

  // Styling based on action type
  const isDanger = variant === 'danger'
  const isSuccess = variant === 'success'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-100 text-center space-y-4 transform transition-all scale-100">
        {/* Icon Header */}
        <div className="flex justify-center">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              isDanger
                ? 'bg-rose-100 text-rose-600'
                : isSuccess
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
            }`}
          >
            {isSuccess ? (
              <RotateCcw className="w-7 h-7" />
            ) : (
              <AlertCircle className="w-7 h-7" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-stone-900 tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 font-semibold rounded-2xl text-xs transition cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-2.5 px-4 text-white font-semibold rounded-2xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                : isSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                  : 'bg-amber-700 hover:bg-amber-800'
            }`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
