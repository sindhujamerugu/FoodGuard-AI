import { describe, expect, it } from 'vitest'
import {
  LANGUAGE_TO_LOCALE,
  toLocaleTag,
  formatDate,
  formatDateTime,
  formatRelative,
  initials,
} from './format'

describe('format utilities — Locale and Language-Aware Formatting', () => {
  it('correctly maps all six supported languages to Indian BCP 47 locales', () => {
    expect(LANGUAGE_TO_LOCALE['en']).toBe('en-IN')
    expect(LANGUAGE_TO_LOCALE['te']).toBe('te-IN')
    expect(LANGUAGE_TO_LOCALE['hi']).toBe('hi-IN')
    expect(LANGUAGE_TO_LOCALE['ta']).toBe('ta-IN')
    expect(LANGUAGE_TO_LOCALE['kn']).toBe('kn-IN')
    expect(LANGUAGE_TO_LOCALE['mr']).toBe('mr-IN')

    expect(toLocaleTag('en')).toBe('en-IN')
    expect(toLocaleTag('te')).toBe('te-IN')
    expect(toLocaleTag('hi')).toBe('hi-IN')
    expect(toLocaleTag('ta')).toBe('ta-IN')
    expect(toLocaleTag('kn')).toBe('kn-IN')
    expect(toLocaleTag('mr')).toBe('mr-IN')
    expect(toLocaleTag(undefined)).toBe('en-IN')
  })

  it('formats dates gracefully with or without locale', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')

    const iso = '2026-03-15T10:30:00.000Z'
    const enDate = formatDate(iso, 'en')
    expect(enDate).toContain('2026')

    const hiDate = formatDate(iso, 'hi')
    expect(hiDate).toBeDefined()
    expect(hiDate.length).toBeGreaterThan(0)

    const teDate = formatDate(iso, 'te')
    expect(teDate).toBeDefined()
  })

  it('formats date-time strings with fallback to dash when empty', () => {
    expect(formatDateTime(null)).toBe('—')
    const iso = '2026-03-15T10:30:00.000Z'
    expect(formatDateTime(iso, 'en')).toContain('2026')
  })

  it('formats relative time using Intl.RelativeTimeFormat with specified language', () => {
    expect(formatRelative(null)).toBe('—')
    const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const relEn = formatRelative(recent, 'en')
    expect(relEn).toContain('minute')
  })

  it('extracts initials cleanly from names', () => {
    expect(initials('John', 'Doe')).toBe('JD')
    expect(initials('Admin', 'User')).toBe('AU')
    expect(initials('', '')).toBe('?')
  })
})
