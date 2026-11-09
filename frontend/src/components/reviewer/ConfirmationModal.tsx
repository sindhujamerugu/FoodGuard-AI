import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary' | 'warning'
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!isOpen) return null

  const confirmToneClasses =
    tone === 'danger'
      ? 'bg-danger-600 hover:bg-danger-700 text-white'
      : tone === 'warning'
        ? 'bg-warning-600 hover:bg-warning-700 text-white'
        : 'bg-primary-700 hover:bg-primary-800 text-white'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/40 backdrop-blur-xs animate-fade-in"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-neutral-100 bg-white p-6 shadow-popover">
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="Close dialog"
        >
          <X className="size-4" aria-hidden="true" />
        </button>

        <div className="flex items-start gap-3">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
              tone === 'danger'
                ? 'bg-danger-50 text-danger-600'
                : tone === 'warning'
                  ? 'bg-warning-50 text-warning-600'
                  : 'bg-primary-50 text-primary-700'
            }`}
          >
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h3 id="confirm-modal-title" className="text-base font-semibold text-neutral-900">
              {title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-neutral-600">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            isLoading={isLoading}
            onClick={onConfirm}
            className={confirmToneClasses}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
