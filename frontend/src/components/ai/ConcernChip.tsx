const LABELS: Record<string, string> = {
  foreign_object: 'Foreign object',
  pest_insect: 'Pest / insect',
  mold_like_growth: 'Mold-like growth',
  spoilage_indicator: 'Spoilage indicator',
  undercooked_appearance: 'Undercooked appearance',
  burnt_overcooked: 'Burnt / overcooked',
  packaging_issue: 'Packaging issue',
  hygiene_indicator: 'Hygiene indicator',
  normal: 'Normal',
  uncertain: 'Uncertain',
}

export function ConcernChip({ concern }: { concern: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700 transition-colors duration-200 hover:bg-neutral-100">
      {LABELS[concern] ?? concern.replace(/_/g, ' ')}
    </span>
  )
}
