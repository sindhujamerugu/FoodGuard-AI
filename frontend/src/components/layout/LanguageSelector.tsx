import { Check, Globe, ChevronDown } from 'lucide-react'
import { Dropdown } from '@/components/ui/Dropdown'
import { SUPPORTED_UI_LANGUAGES, useLanguage } from '@/i18n/LanguageContext'
import { UI_NATIVE_LABELS } from '@/types/user'
import { cn } from '@/lib/cn'

interface LanguageSelectorProps {
  variant?: 'ghost' | 'outline'
  className?: string
}

/** Global and pre-auth language switcher.
 * Lists all six supported UI languages in their authentic native scripts:
 * English, తెలుగు, हिन्दी, தமிழ், ಕನ್ನಡ, मराठी.
 * Switching updates the page immediately and persists the choice to localStorage. */
export function LanguageSelector({ variant = 'ghost', className }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useLanguage()

  const trigger = (
    <span
      data-testid="language-selector-trigger"
      className={cn(
        'inline-flex items-center gap-2 text-sm font-medium transition-colors select-none',
        variant === 'outline'
          ? 'rounded-xl border border-neutral-200/90 bg-white px-3 py-1.5 text-neutral-700 shadow-2xs hover:border-neutral-300 hover:bg-neutral-50 active:bg-neutral-100'
          : 'rounded-full px-2.5 py-1.5 text-neutral-600 hover:bg-neutral-50',
        className,
      )}
      aria-label={t('common.language')}
    >
      <Globe className={cn('size-4 shrink-0', variant === 'outline' ? 'text-primary-700' : 'text-neutral-500')} aria-hidden="true" />
      <span className={cn('font-medium', variant === 'outline' ? 'inline' : 'hidden sm:inline')}>
        {UI_NATIVE_LABELS[language] ?? language}
      </span>
      <ChevronDown className="size-3.5 text-neutral-400 shrink-0" aria-hidden="true" />
    </span>
  )

  return (
    <Dropdown
      align="right"
      trigger={trigger}
      items={SUPPORTED_UI_LANGUAGES.map((code) => ({
        label: UI_NATIVE_LABELS[code] ?? code,
        onSelect: () => setLanguage(code),
        icon: code === language ? <Check className="size-4 text-primary-600" aria-hidden="true" /> : <span className="size-4" />,
      }))}
    />
  )
}
