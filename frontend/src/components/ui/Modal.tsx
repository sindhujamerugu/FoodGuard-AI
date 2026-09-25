import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export function Modal({ open, onClose, title, description, children, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose()
      }}
      aria-labelledby="modal-title"
      aria-describedby={description ? 'modal-description' : undefined}
      className={cn(
        'w-full rounded-2xl border-0 bg-white p-0 shadow-popover backdrop:bg-neutral-900/40',
        'open:animate-fade-in',
        sizeStyles[size],
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-6 py-4">
        <div>
          <h2 id="modal-title" className="text-base font-semibold text-neutral-900">
            {title}
          </h2>
          {description && (
            <p id="modal-description" className="mt-1 text-sm text-neutral-500">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </dialog>
  )
}
