import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  LanguageProvider,
  useLanguage,
  SUPPORTED_UI_LANGUAGES,
  DICTIONARIES,
} from './LanguageContext'
import { en } from './en'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { PriorityBadge } from '@/components/badges/PriorityBadge'
import { RoleBadge } from '@/components/badges/RoleBadge'
import { RiskIndicator } from '@/components/ai/RiskIndicator'

const mockUpdatePreferredLanguage = vi.fn()

vi.mock('@/api/auth', () => ({
  authApi: {
    updatePreferredLanguage: (...args: unknown[]) => mockUpdatePreferredLanguage(...args),
  },
}))

const mockUseAuth = vi.fn()
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

function Probe() {
  const { language, setLanguage, t } = useLanguage()
  return (
    <div>
      <span data-testid="current-language">{language}</span>
      <span data-testid="translated">{t('common.cancel')}</span>
      <button onClick={() => setLanguage('te')}>switch to telugu</button>
      <button onClick={() => setLanguage('hi')}>switch to hindi</button>
      <button onClick={() => setLanguage('ta')}>switch to tamil</button>
      <button onClick={() => setLanguage('kn')}>switch to kannada</button>
      <button onClick={() => setLanguage('mr')}>switch to marathi</button>
      <button onClick={() => setLanguage('en')}>switch to english</button>
    </div>
  )
}

describe('LanguageContext — Full 6-Language Localization Suite', () => {
  beforeEach(() => {
    localStorage.clear()
    mockUpdatePreferredLanguage.mockReset().mockResolvedValue({})
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false })
  })

  it('supports all six languages in SUPPORTED_UI_LANGUAGES and DICTIONARIES', () => {
    expect(SUPPORTED_UI_LANGUAGES).toEqual(['en', 'te', 'hi', 'ta', 'kn', 'mr'])
    expect(Object.keys(DICTIONARIES)).toEqual(['en', 'te', 'hi', 'ta', 'kn', 'mr'])
  })

  it('guarantees every dictionary has the exact same 288 keys as en.ts with zero missing keys', () => {
    const enKeys = Object.keys(en)
    expect(enKeys.length).toBe(288)

    for (const lang of SUPPORTED_UI_LANGUAGES) {
      const dict = DICTIONARIES[lang]
      expect(dict).toBeDefined()
      const dictKeys = Object.keys(dict)
      expect(dictKeys.length).toBe(288)
      expect(dictKeys.sort()).toEqual(enKeys.sort())

      // Verify no empty string values
      for (const key of enKeys) {
        const val = dict[key as keyof typeof en]
        expect(val).toBeDefined()
        expect(typeof val).toBe('string')
        expect((val as string).trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('defaults to English with no stored preference and no authenticated user', () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    expect(screen.getByTestId('current-language')).toHaveTextContent('en')
    expect(screen.getByTestId('translated')).toHaveTextContent('Cancel')
  })

  it('switches to Telugu and renders real Telugu text immediately without page reload', async () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    await userEvent.click(screen.getByText('switch to telugu'))
    expect(screen.getByTestId('current-language')).toHaveTextContent('te')
    const text = screen.getByTestId('translated').textContent ?? ''
    expect(text).toBe('రద్దు చేయండి')
  })

  it('switches to Hindi and renders real Hindi text immediately without page reload', async () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    await userEvent.click(screen.getByText('switch to hindi'))
    expect(screen.getByTestId('current-language')).toHaveTextContent('hi')
    const text = screen.getByTestId('translated').textContent ?? ''
    expect(text).toBe('रद्द करें')
  })

  it('switches to Tamil and renders real Tamil text immediately without page reload', async () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    await userEvent.click(screen.getByText('switch to tamil'))
    expect(screen.getByTestId('current-language')).toHaveTextContent('ta')
    const text = screen.getByTestId('translated').textContent ?? ''
    expect(text).toBe('ரத்துசெய்')
  })

  it('switches to Kannada and renders real Kannada text immediately without page reload', async () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    await userEvent.click(screen.getByText('switch to kannada'))
    expect(screen.getByTestId('current-language')).toHaveTextContent('kn')
    const text = screen.getByTestId('translated').textContent ?? ''
    expect(text).toBe('ರದ್ದುಮಾಡಿ')
  })

  it('switches to Marathi and renders real Marathi text immediately without page reload', async () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    await userEvent.click(screen.getByText('switch to marathi'))
    expect(screen.getByTestId('current-language')).toHaveTextContent('mr')
    const text = screen.getByTestId('translated').textContent ?? ''
    expect(text).toBe('रद्द करा')
  })

  it('persists the language choice to localStorage across navigation and reloads', async () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    await userEvent.click(screen.getByText('switch to tamil'))
    expect(localStorage.getItem('foodguard.language')).toBe('ta')
  })

  it('a fresh provider instance picks up the persisted choice on next load', async () => {
    localStorage.setItem('foodguard.language', 'kn')
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    expect(screen.getByTestId('current-language')).toHaveTextContent('kn')
    expect(screen.getByTestId('translated')).toHaveTextContent('ರದ್ದುಮಾಡಿ')
  })

  it('an unauthenticated user switching language never calls the backend sync', async () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    await userEvent.click(screen.getByText('switch to marathi'))
    expect(mockUpdatePreferredLanguage).not.toHaveBeenCalled()
  })

  it('an authenticated user switching language syncs the choice to the backend (best-effort)', async () => {
    mockUseAuth.mockReturnValue({ user: { preferred_language: 'en' }, isAuthenticated: true })
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    await userEvent.click(screen.getByText('switch to marathi'))
    await waitFor(() => expect(mockUpdatePreferredLanguage).toHaveBeenCalledWith('mr'))
  })

  it('a failed backend sync never reverts or blocks the already-applied language switch', async () => {
    mockUpdatePreferredLanguage.mockRejectedValue(new Error('network error'))
    mockUseAuth.mockReturnValue({ user: { preferred_language: 'en' }, isAuthenticated: true })
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    await userEvent.click(screen.getByText('switch to hindi'))
    await waitFor(() => expect(mockUpdatePreferredLanguage).toHaveBeenCalled())
    expect(screen.getByTestId('current-language')).toHaveTextContent('hi')
  })

  it("a first-time device adopts the signed-in user's server-side preference", () => {
    mockUseAuth.mockReturnValue({ user: { preferred_language: 'ta' }, isAuthenticated: true })
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    expect(screen.getByTestId('current-language')).toHaveTextContent('ta')
  })

  it("does not override a device's already-chosen language with the user's server preference", () => {
    localStorage.setItem('foodguard.language', 'en')
    mockUseAuth.mockReturnValue({ user: { preferred_language: 'te' }, isAuthenticated: true })
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    expect(screen.getByTestId('current-language')).toHaveTextContent('en')
  })

  it('falls back to English for an unsupported server-side preference', () => {
    mockUseAuth.mockReturnValue({ user: { preferred_language: 'fr' as any }, isAuthenticated: true })
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    expect(screen.getByTestId('current-language')).toHaveTextContent('en')
  })

  it('localizes StatusBadge across language changes', async () => {
    function StatusProbe() {
      const { setLanguage } = useLanguage()
      return (
        <div>
          <button onClick={() => setLanguage('te')}>switch to te</button>
          <StatusBadge status="DRAFT" />
          <StatusBadge status="SUBMITTED" />
          <StatusBadge status="UNDER_REVIEW" />
          <StatusBadge status="RESOLVED" />
          <StatusBadge status="CLOSED" />
        </div>
      )
    }

    render(
      <LanguageProvider>
        <StatusProbe />
      </LanguageProvider>,
    )

    // English defaults
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('Submitted')).toBeInTheDocument()
    expect(screen.getByText('Under Review')).toBeInTheDocument()
    expect(screen.getByText('Resolved')).toBeInTheDocument()
    expect(screen.getByText('Closed')).toBeInTheDocument()

    // Switch to Telugu
    await userEvent.click(screen.getByText('switch to te'))
    expect(screen.getByText('డ్రాఫ్ట్')).toBeInTheDocument()
    expect(screen.getByText('సమర్పించబడింది')).toBeInTheDocument()
    expect(screen.getByText('సమీక్షలో ఉంది')).toBeInTheDocument()
    expect(screen.getByText('పరిష్కరించబడింది')).toBeInTheDocument()
    expect(screen.getByText('మూసివేయబడింది')).toBeInTheDocument()
  })

  it('localizes PriorityBadge across language changes', async () => {
    function PriorityProbe() {
      const { setLanguage } = useLanguage()
      return (
        <div>
          <button onClick={() => setLanguage('hi')}>switch to hi</button>
          <PriorityBadge priority="LOW" />
          <PriorityBadge priority="MEDIUM" />
          <PriorityBadge priority="HIGH" />
          <PriorityBadge priority="CRITICAL" />
        </div>
      )
    }

    render(
      <LanguageProvider>
        <PriorityProbe />
      </LanguageProvider>,
    )

    // English defaults
    expect(screen.getByText('Low')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Critical')).toBeInTheDocument()

    // Switch to Hindi
    await userEvent.click(screen.getByText('switch to hi'))
    expect(screen.getByText('निम्न')).toBeInTheDocument()
    expect(screen.getByText('मध्यम')).toBeInTheDocument()
    expect(screen.getByText('उच्च')).toBeInTheDocument()
    expect(screen.getByText('गंभीर')).toBeInTheDocument()
  })

  it('localizes RoleBadge across language changes', async () => {
    function RoleProbe() {
      const { setLanguage } = useLanguage()
      return (
        <div>
          <button onClick={() => setLanguage('ta')}>switch to ta</button>
          <RoleBadge role="CUSTOMER" />
          <RoleBadge role="RESTAURANT_USER" />
          <RoleBadge role="REVIEWER" />
          <RoleBadge role="ADMIN" />
        </div>
      )
    }

    render(
      <LanguageProvider>
        <RoleProbe />
      </LanguageProvider>,
    )

    // English defaults
    expect(screen.getByText('Customer')).toBeInTheDocument()
    expect(screen.getByText('Restaurant')).toBeInTheDocument()
    expect(screen.getByText('Reviewer')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()

    // Switch to Tamil
    await userEvent.click(screen.getByText('switch to ta'))
    expect(screen.getByText('வாடிக்கையாளர்')).toBeInTheDocument()
    expect(screen.getByText('உணவகம்')).toBeInTheDocument()
    expect(screen.getByText('மதிப்பாய்வாளர்')).toBeInTheDocument()
    expect(screen.getByText('நிர்வாகி')).toBeInTheDocument()
  })

  it('localizes RiskIndicator across language changes', async () => {
    function RiskProbe() {
      const { setLanguage } = useLanguage()
      return (
        <div>
          <button onClick={() => setLanguage('mr')}>switch to mr</button>
          <RiskIndicator risk="LOW" />
          <RiskIndicator risk="MEDIUM" />
          <RiskIndicator risk="HIGH" />
          <RiskIndicator risk="HUMAN_REVIEW" />
        </div>
      )
    }

    render(
      <LanguageProvider>
        <RiskProbe />
      </LanguageProvider>,
    )

    // English defaults
    expect(screen.getByText('Low Risk')).toBeInTheDocument()
    expect(screen.getByText('Medium Risk')).toBeInTheDocument()
    expect(screen.getByText('High Risk')).toBeInTheDocument()
    expect(screen.getByText('Human Review Required')).toBeInTheDocument()

    // Switch to Marathi
    await userEvent.click(screen.getByText('switch to mr'))
    expect(screen.getByText('कमी धोका')).toBeInTheDocument()
    expect(screen.getByText('मध्यम धोका')).toBeInTheDocument()
    expect(screen.getByText('उच्च धोका')).toBeInTheDocument()
    expect(screen.getByText('मानवी पुनरावलोकन आवश्यक')).toBeInTheDocument()
  })
})

