import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Globe, Info } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Reveal } from '@/components/motion/Reveal'
import { SUPPORTED_UI_LANGUAGES, useLanguage, type UiLanguage } from '@/i18n/LanguageContext'
import { UI_NATIVE_LABELS, LANGUAGE_LABELS } from '@/types/user'
import { useTranslation } from '@/i18n/LanguageContext'
import { cn } from '@/lib/cn'

// Language metadata including a brief "label in English" sub-label
const LANGUAGE_META: Record<UiLanguage, { script: string; region: string }> = {
  en: { script: 'Latin', region: 'Global' },
  te: { script: 'Telugu script', region: 'Andhra Pradesh & Telangana' },
  hi: { script: 'Devanagari', region: 'North India' },
  ta: { script: 'Tamil script', region: 'Tamil Nadu' },
  kn: { script: 'Kannada script', region: 'Karnataka' },
  mr: { script: 'Devanagari', region: 'Maharashtra' },
  ml: { script: 'Malayalam script', region: 'Kerala' },
}

export default function LanguageSettings() {
  const t = useTranslation()
  const { language, setLanguage } = useLanguage()
  const [justChanged, setJustChanged] = useState<UiLanguage | null>(null)

  function handleSelect(lang: UiLanguage) {
    if (lang === language) return
    setLanguage(lang)
    setJustChanged(lang)
    setTimeout(() => setJustChanged(null), 2500)
  }

  return (
    <AppShell title={t('languageSettings.title')}>
      {/* Back link */}
      <Link
        to="/dashboard"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t('languageSettings.backToDashboard')}
      </Link>

      {/* Header */}
      <Reveal variant="fade" className="mb-8">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
            <Globe className="size-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-primary-900">{t('languageSettings.heading')}</h2>
            <p className="mt-1 text-sm text-neutral-500 max-w-xl">{t('languageSettings.subtitle')}</p>
          </div>
        </div>
      </Reveal>

      {/* Success toast */}
      {justChanged && (
        <Reveal variant="fade" className="mb-6">
          <div className="flex items-center gap-3 rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 shadow-sm">
            <Check className="size-4 shrink-0" aria-hidden="true" />
            {t('languageSettings.changed', { name: UI_NATIVE_LABELS[justChanged] ?? justChanged })}
          </div>
        </Reveal>
      )}

      {/* Language grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SUPPORTED_UI_LANGUAGES.map((lang, i) => {
          const isActive = lang === language
          const meta = LANGUAGE_META[lang]
          return (
            <Reveal key={lang} delay={i * 60}>
              <button
                type="button"
                onClick={() => handleSelect(lang)}
                aria-pressed={isActive}
                className={cn(
                  'group relative w-full text-left rounded-2xl border-2 p-5 transition-all duration-200',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
                  isActive
                    ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-white shadow-md shadow-primary-100'
                    : 'border-neutral-200 bg-white hover:border-primary-300 hover:shadow-card hover:-translate-y-0.5',
                )}
              >
                {/* Active checkmark */}
                {isActive && (
                  <span className="absolute right-4 top-4 flex size-6 items-center justify-center rounded-full bg-primary-600 text-white">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                )}

                {/* Language name in native script */}
                <p className="text-xl font-semibold text-neutral-900">
                  {UI_NATIVE_LABELS[lang] ?? lang}
                </p>

                {/* English label */}
                <p className="mt-0.5 text-sm text-neutral-500">
                  {lang === 'ml' ? 'Malayalam' : LANGUAGE_LABELS[lang as keyof typeof LANGUAGE_LABELS] ?? lang}
                </p>

                {/* Region */}
                <p className="mt-2 text-xs text-neutral-400">{meta.region}</p>

                {/* Selected indicator */}
                {isActive && (
                  <span className="mt-3 inline-block rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                    {t('languageSettings.selected')}
                  </span>
                )}
              </button>
            </Reveal>
          )
        })}
      </div>

      {/* Disclaimer notice */}
      <Reveal delay={200} className="mt-8">
        <div className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
          <Info className="mt-0.5 size-4 shrink-0 text-neutral-400" aria-hidden="true" />
          <p>{t('languageSettings.liveTranslationNote')}</p>
        </div>
      </Reveal>
    </AppShell>
  )
}
