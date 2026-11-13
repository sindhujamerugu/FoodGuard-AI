import { useEffect, useRef, useState } from 'react'
import { AlertCircle, AlertTriangle, ShieldAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'

interface RejectComplaintModalProps {
  isOpen: boolean
  complaintId: number
  complaintTitle: string
  isLoading?: boolean
  apiError?: string | null
  onConfirm: (reason: string, additionalRemarks?: string) => Promise<void>
  onCancel: () => void
}

const MIN_REASON_LENGTH = 10
const MAX_REASON_LENGTH = 1000

export function RejectComplaintModal({
  isOpen,
  complaintId,
  complaintTitle,
  isLoading = false,
  apiError = null,
  onConfirm,
  onCancel,
}: RejectComplaintModalProps) {
  const [reason, setReason] = useState('')
  const [additionalRemarks, setAdditionalRemarks] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus textarea when opened and reset state
  useEffect(() => {
    if (isOpen) {
      setReason('')
      setAdditionalRemarks('')
      setValidationError(null)
      setIsSubmitting(false)
      const timer = setTimeout(() => {
        textareaRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Handle ESC key to dismiss (only if not currently submitting)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen && !isLoading && !isSubmitting) {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, isSubmitting, onCancel])

  if (!isOpen) return null

  const trimmedReason = reason.trim()
  const charCount = reason.length
  const isBusy = isLoading || isSubmitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isBusy) return

    if (!trimmedReason) {
      setValidationError('A rejection reason is mandatory. Please provide a formal explanation.')
      textareaRef.current?.focus()
      return
    }

    if (trimmedReason.length < MIN_REASON_LENGTH) {
      setValidationError(
        `Rejection reason must be at least ${MIN_REASON_LENGTH} characters long (currently ${trimmedReason.length}).`
      )
      textareaRef.current?.focus()
      return
    }

    if (charCount > MAX_REASON_LENGTH) {
      setValidationError(`Rejection reason cannot exceed ${MAX_REASON_LENGTH} characters.`)
      return
    }

    setValidationError(null)
    setIsSubmitting(true)
    try {
      await onConfirm(trimmedReason, additionalRemarks.trim() || undefined)
    } catch {
      // API error handled by parent or displayed via apiError prop
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
      aria-describedby="reject-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/50 backdrop-blur-xs motion-safe:animate-fade-in"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-danger-100 bg-white p-6 shadow-popover">
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isBusy}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 transition-colors"
          aria-label="Close rejection dialog"
        >
          <X className="size-4" aria-hidden="true" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-danger-50 text-danger-600 border border-danger-200">
            <ShieldAlert className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h3 id="reject-modal-title" className="text-base font-bold text-neutral-900">
              Reject Complaint #{complaintId}
            </h3>
            <p id="reject-modal-desc" className="text-xs text-neutral-500 mt-0.5 line-clamp-1">
              Case: &ldquo;{complaintTitle}&rdquo;
            </p>
          </div>
        </div>

        {/* Advisory Callout */}
        <div className="mt-4 rounded-xl border border-warning-200 bg-warning-50/70 p-3 text-xs text-warning-800 flex items-start gap-2.5">
          <AlertTriangle className="size-4 text-warning-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">
            <strong className="font-semibold text-warning-900">Irreversible Action:</strong> Rejecting
            this complaint concludes the case without punitive action. The reason provided below will be
            published to the customer&apos;s timeline and sent via notification.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Mandatory Rejection Reason */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="rejection-reason"
                className="text-xs font-semibold text-neutral-800 uppercase tracking-wide flex items-center gap-1"
              >
                Rejection Reason <span className="text-danger-600">*</span>
              </label>
              <span
                className={`text-[11px] font-mono ${
                  charCount > MAX_REASON_LENGTH
                    ? 'text-danger-600 font-bold'
                    : charCount < MIN_REASON_LENGTH && charCount > 0
                    ? 'text-warning-600'
                    : 'text-neutral-400'
                }`}
              >
                {charCount}/{MAX_REASON_LENGTH}
              </span>
            </div>
            <textarea
              id="rejection-reason"
              ref={textareaRef}
              rows={4}
              disabled={isBusy}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (validationError) setValidationError(null)
              }}
              placeholder="State the regulatory or evidentiary basis for rejection (e.g., lack of verifiable evidence, unidentifiable vendor, duplicate filing, outside jurisdiction)..."
              className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-danger-500 focus:outline-hidden focus:ring-2 focus:ring-danger-500/20 disabled:bg-neutral-50 disabled:text-neutral-400 transition-colors"
            />
            <p className="mt-1 text-[11px] text-neutral-500">
              Minimum 10 characters. Plain and concise rationale visible to the customer.
            </p>
          </div>

          {/* Optional Additional Internal Remarks */}
          <div className="space-y-1">
            <Textarea
              label="Optional Resolution Notes / Internal Remarks"
              value={additionalRemarks}
              disabled={isBusy}
              onChange={(e) => setAdditionalRemarks(e.target.value)}
              rows={2}
              placeholder="Any additional investigator notes or internal audit remarks..."
              hint="Saved in case resolution notes."
            />
          </div>

          {/* Validation Error Banner */}
          {validationError && (
            <div role="alert" className="flex items-center gap-2 rounded-xl bg-danger-50 p-3 text-xs text-danger-700 border border-danger-200">
              <AlertCircle className="size-4 shrink-0 text-danger-600" aria-hidden="true" />
              <span>{validationError}</span>
            </div>
          )}

          {/* API Error Banner */}
          {apiError && (
            <div role="alert" className="flex items-center gap-2 rounded-xl bg-danger-50 p-3 text-xs text-danger-700 border border-danger-200">
              <AlertCircle className="size-4 shrink-0 text-danger-600" aria-hidden="true" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="mt-6 flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isBusy}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isBusy}
              className="bg-danger-600 hover:bg-danger-700 text-white font-medium shadow-xs"
            >
              Confirm Rejection
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

