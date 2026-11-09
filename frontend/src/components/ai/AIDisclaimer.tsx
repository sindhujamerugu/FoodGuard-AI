import { Info } from 'lucide-react'
import { useTranslation } from '@/i18n'

export function AIDisclaimer() {
  const { t } = useTranslation()

  return (
    <div className="flex items-start gap-3 rounded-xl border border-info-100 bg-info-50 px-4 py-3">
      <Info className="mt-0.5 size-4 shrink-0 text-info-600" aria-hidden="true" />
      <p className="text-xs leading-relaxed text-neutral-700">
        <span className="font-semibold">{t('ai.disclaimer.title')}</span> {t('ai.disclaimer.text')}
      </p>
    </div>
  )
}
