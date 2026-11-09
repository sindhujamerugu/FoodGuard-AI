import { useState } from 'react'
import { AlertCircle, ShieldAlert, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useCreateEscalation } from '@/hooks/useEscalations'
import { useTranslation } from '@/i18n/LanguageContext'
import { toApiError } from '@/types/errors'
import type { EscalationLevel } from '@/types/escalation'

interface EscalateCaseModalProps {
  isOpen: boolean
  complaintId: number
  caseTitle: string
  onClose: () => void
  onSuccess?: () => void
}

export function EscalateCaseModal({
  isOpen,
  complaintId,
  caseTitle,
  onClose,
  onSuccess,
}: EscalateCaseModalProps) {
  const t = useTranslation()
  const [level, setLevel] = useState<EscalationLevel>('LEVEL_1')
  const [reason, setReason] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const createEscalation = useCreateEscalation()

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) {
      setErrorMsg('Please state a reason for escalating this case.')
      return
    }

    setErrorMsg(null)
    try {
      await createEscalation.mutateAsync({
        complaint: complaintId,
        escalation_level: level,
        reason: reason.trim(),
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      setErrorMsg(toApiError(err).message)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="escalate-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/40 backdrop-blur-xs animate-fade-in"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-neutral-100 bg-white p-6 shadow-popover">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label={t('common.close')}
        >
          <X className="size-4" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-danger-50 text-danger-600">
            <ShieldAlert className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h3 id="escalate-modal-title" className="text-base font-semibold text-neutral-900">
              Escalate Case for Higher Review
            </h3>
            <p className="text-xs text-neutral-500 truncate max-w-sm">
              Complaint #{complaintId}: {caseTitle}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Select
            label="Escalation Level"
            value={level}
            onChange={(e) => setLevel(e.target.value as EscalationLevel)}
            hint="Internal platform review tier."
          >
            <option value="LEVEL_1">{t('escalation.level1')}</option>
            <option value="LEVEL_2">{t('escalation.level2')}</option>
            <option value="LEVEL_3">{t('escalation.level3')}</option>
          </Select>

          <Textarea
            label="Reason for Escalation"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            required
            placeholder="Explain why this case requires escalation (e.g., severe alleged contamination, recurring hygiene violations, legal or health risk)..."
            hint="Recorded in the internal case audit trail."
          />

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-danger-50 px-3.5 py-2.5 text-xs text-danger-700">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-2.5 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={createEscalation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={createEscalation.isPending}
              className="bg-danger-600 hover:bg-danger-700 text-white"
            >
              Confirm Escalation
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
