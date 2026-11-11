import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '@/api/auth'
import { useAuth } from '@/context/AuthContext'
import { en, type TranslationKey } from './en'
export type { TranslationKey } from './en'
import { hi } from './hi'
import { te } from './te'
import { ta } from './ta'
import { kn } from './kn'
import { mr } from './mr'
import { ml } from './ml'

/** All six supported UI languages for FoodGuard AI:
 * English, Telugu, Hindi, Tamil, Kannada, and Marathi. */
export const SUPPORTED_UI_LANGUAGES = ['en', 'te', 'hi', 'ta', 'kn', 'mr', 'ml'] as const
export type UiLanguage = (typeof SUPPORTED_UI_LANGUAGES)[number]

export const DICTIONARIES: Record<UiLanguage, Partial<Record<TranslationKey, string>>> = {
  en,
  te,
  hi,
  ta,
  kn,
  mr,
  ml,
}

const STORAGE_KEY = 'foodguard.language'

function isSupportedUiLanguage(value: string | null | undefined): value is UiLanguage {
  return !!value && (SUPPORTED_UI_LANGUAGES as readonly string[]).includes(value)
}

function readStoredLanguage(): UiLanguage | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isSupportedUiLanguage(stored) ? stored : null
  } catch {
    // Private browsing / storage disabled — treat as "no stored preference".
    return null
  }
}

interface LanguageContextValue {
  language: UiLanguage
  setLanguage: (lang: UiLanguage) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [language, setLanguageState] = useState<UiLanguage>(() => readStoredLanguage() ?? 'en')

  // First time on this device (no explicit local choice saved yet), adopt
  // the signed-in user's server-side preference if we have a translation
  // dictionary for it. Never overrides a choice the person already made
  // on this device/browser.
  useEffect(() => {
    if (!isAuthenticated || !user) return
    const stored = readStoredLanguage()
    if (stored) {
      if (stored !== user.preferred_language) {
        void authApi.updatePreferredLanguage(stored).catch(() => {})
      }
    } else if (isSupportedUiLanguage(user.preferred_language)) {
      setLanguageState(user.preferred_language)
      try {
        localStorage.setItem(STORAGE_KEY, user.preferred_language)
      } catch {
        // Storage disabled/private browsing
      }
    }
  }, [isAuthenticated, user])

  const setLanguage = useCallback(
    (lang: UiLanguage) => {
      setLanguageState(lang)
      try {
        localStorage.setItem(STORAGE_KEY, lang)
      } catch {
        // Best-effort persistence only — the in-memory state above is
        // what actually drives the current page, regardless.
      }
      if (isAuthenticated) {
        // Best-effort sync to the backend so the choice follows the user
        // across devices/sessions. A failed PATCH must never block or
        // revert the language switch that already happened above.
        void authApi.updatePreferredLanguage(lang).catch(() => {})
      }
    },
    [isAuthenticated],
  )

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>): string => {
      const text = DICTIONARIES[language][key] ?? en[key] ?? key
      if (!vars) return text
      return Object.entries(vars).reduce(
        (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
        text,
      )
    },
    [language],
  )

  const value = useMemo<LanguageContextValue>(() => ({ language, setLanguage, t }), [language, setLanguage, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider.')
  return ctx
}

/**
 * Convenience hook that supports both `const t = useTranslation()` and
 * `const { t, language } = useTranslation()`.
 */
export function useTranslation() {
  const { t, language, setLanguage } = useLanguage()
  const fn = t as ((key: TranslationKey, vars?: Record<string, string | number>) => string) & {
    t: typeof t
    language: UiLanguage
    setLanguage: typeof setLanguage
  }
  fn.t = t
  fn.language = language
  fn.setLanguage = setLanguage
  return fn
}
