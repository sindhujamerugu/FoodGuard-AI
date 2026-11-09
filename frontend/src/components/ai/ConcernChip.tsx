import { useTranslation, type TranslationKey } from '@/i18n'

const CONCERN_KEYS: Record<string, TranslationKey> = {
  foreign_object: 'ai.concern.foreign_object',
  pest_insect: 'ai.concern.pest_insect',
  mold_like_growth: 'ai.concern.mold_like_growth',
  spoilage_indicator: 'ai.concern.spoilage_indicator',
  undercooked_appearance: 'ai.concern.undercooked_appearance',
  burnt_overcooked: 'ai.concern.burnt_overcooked',
  packaging_issue: 'ai.concern.packaging_issue',
  hygiene_indicator: 'ai.concern.hygiene_indicator',
  normal: 'ai.concern.normal',
  uncertain: 'ai.concern.uncertain',
}

export function ConcernChip({ concern }: { concern: string }) {
  const { t } = useTranslation()
  const key = CONCERN_KEYS[concern]
  const label = key ? t(key) : concern.replace(/_/g, ' ')

  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700 transition-colors duration-200 hover:bg-neutral-100">
      {label}
    </span>
  )
}
