export const LANGUAGE_TO_LOCALE: Record<string, string> = {
  en: 'en-IN',
  te: 'te-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  kn: 'kn-IN',
  mr: 'mr-IN',
}

export function toLocaleTag(langOrLocale?: string): string {
  if (!langOrLocale) return 'en-IN'
  return LANGUAGE_TO_LOCALE[langOrLocale] ?? langOrLocale
}

export function formatDate(iso: string | null | undefined, langOrLocale?: string): string {
  if (!iso) return '—'
  const locale = toLocaleTag(langOrLocale)
  return new Date(iso).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(iso: string | null | undefined, langOrLocale?: string): string {
  if (!iso) return '—'
  const locale = toLocaleTag(langOrLocale)
  return new Date(iso).toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatRelative(iso: string | null | undefined, langOrLocale?: string): string {
  if (!iso) return '—'
  const locale = toLocaleTag(langOrLocale)
  const date = new Date(iso)
  const diffMs = date.getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / 60_000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  const absMinutes = Math.abs(diffMinutes)
  if (absMinutes < 60) return rtf.format(diffMinutes, 'minute')
  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour')
  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day')
  const diffMonths = Math.round(diffDays / 30)
  return rtf.format(diffMonths, 'month')
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?'
}

