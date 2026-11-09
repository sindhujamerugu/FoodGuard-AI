import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LanguageProvider, useLanguage } from '@/i18n/LanguageContext'
import { en } from '@/i18n/en'
import { te } from '@/i18n/te'
import { hi } from '@/i18n/hi'
import { ta } from '@/i18n/ta'
import { kn } from '@/i18n/kn'
import { mr } from '@/i18n/mr'
import { AIDisclaimer } from '@/components/ai/AIDisclaimer'
import { ConfidenceBar } from '@/components/ai/ConfidenceBar'
import { ConcernChip } from '@/components/ai/ConcernChip'
import { AIAnalysisCard } from '@/components/ai/AIAnalysisCard'
import { ComplaintTimeline, LinkedReportBadge } from '@/components/complaints/ComplaintTimeline'
import { ComplaintOverview } from '@/components/complaints/ComplaintOverview'
import Profile from '@/pages/Profile'
import type { AIAnalysis } from '@/types/aiAnalysis'
import type { Complaint } from '@/types/complaint'

// Mock useAuth
const mockUser = {
  id: 1,
  first_name: 'Rahul',
  last_name: 'Sharma',
  email: 'rahul@example.com',
  phone: '9876543210',
  role: 'CUSTOMER' as const,
  preferred_language: 'en' as const,
  date_joined: '2025-01-15T10:00:00Z',
}

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
  }),
}))

describe('Phase 3 — Customer Portal Full Language Localization', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  it('verifies 100% dictionary key parity across all 6 languages (en, te, hi, ta, kn, mr)', () => {
    const enKeys = Object.keys(en)
    const teKeys = Object.keys(te)
    const hiKeys = Object.keys(hi)
    const taKeys = Object.keys(ta)
    const knKeys = Object.keys(kn)
    const mrKeys = Object.keys(mr)

    expect(enKeys.length).toBe(288)
    expect(teKeys.length).toBe(288)
    expect(hiKeys.length).toBe(288)
    expect(taKeys.length).toBe(288)
    expect(knKeys.length).toBe(288)
    expect(mrKeys.length).toBe(288)

    // Check no empty translations
    for (const key of enKeys) {
      expect(te[key as keyof typeof te], `Missing te translation for ${key}`).toBeTruthy()
      expect(hi[key as keyof typeof hi], `Missing hi translation for ${key}`).toBeTruthy()
      expect(ta[key as keyof typeof ta], `Missing ta translation for ${key}`).toBeTruthy()
      expect(kn[key as keyof typeof kn], `Missing kn translation for ${key}`).toBeTruthy()
      expect(mr[key as keyof typeof mr], `Missing mr translation for ${key}`).toBeTruthy()
    }
  })

  it('localizes AIDisclaimer and ConfidenceBar dynamically across languages', async () => {
    function DisclaimerProbe() {
      const { setLanguage } = useLanguage()
      return (
        <div>
          <button onClick={() => setLanguage('te')}>switch to te</button>
          <button onClick={() => setLanguage('hi')}>switch to hi</button>
          <AIDisclaimer />
          <ConfidenceBar confidence={0.88} />
        </div>
      )
    }

    render(
      <LanguageProvider>
        <DisclaimerProbe />
      </LanguageProvider>,
    )

    // English defaults
    expect(screen.getByText('Preliminary visual assessment only.')).toBeInTheDocument()
    expect(screen.getByText('Model confidence')).toBeInTheDocument()

    // Switch to Telugu
    await userEvent.click(screen.getByText('switch to te'))
    expect(screen.getByText('ప్రాథమిక విజువల్ అంచనా మాత్రమే.')).toBeInTheDocument()
    expect(screen.getByText('మోడల్ విశ్వసనీయత')).toBeInTheDocument()

    // Switch to Hindi
    await userEvent.click(screen.getByText('switch to hi'))
    expect(screen.getByText('केवल प्रारंभिक दृश्य मूल्यांकन।')).toBeInTheDocument()
    expect(screen.getByText('मॉडल विश्वसनीयता')).toBeInTheDocument()
  })

  it('localizes ConcernChip across food safety concern types without raw strings', async () => {
    function ConcernProbe() {
      const { setLanguage } = useLanguage()
      return (
        <div>
          <button onClick={() => setLanguage('kn')}>switch to kn</button>
          <button onClick={() => setLanguage('ta')}>switch to ta</button>
          <ConcernChip concern="pest_insect" />
          <ConcernChip concern="mold_like_growth" />
          <ConcernChip concern="foreign_object" />
        </div>
      )
    }

    render(
      <LanguageProvider>
        <ConcernProbe />
      </LanguageProvider>,
    )

    // English defaults
    expect(screen.getByText('Pest / insect')).toBeInTheDocument()
    expect(screen.getByText('Mold-like growth')).toBeInTheDocument()
    expect(screen.getByText('Foreign object')).toBeInTheDocument()

    // Switch to Kannada
    await userEvent.click(screen.getByText('switch to kn'))
    expect(screen.getByText('ಕೀಟ / ಕ್ರಿಮಿ')).toBeInTheDocument()
    expect(screen.getByText('ಬೂಜು ತರಹದ ಬೆಳವಣಿಗೆ')).toBeInTheDocument()
    expect(screen.getByText('ಬಾಹ್ಯ ವಸ್ತು')).toBeInTheDocument()

    // Switch to Tamil
    await userEvent.click(screen.getByText('switch to ta'))
    expect(screen.getByText('பூச்சி / வண்டு')).toBeInTheDocument()
    expect(screen.getByText('பூஞ்சை போன்ற வளர்ச்சி')).toBeInTheDocument()
    expect(screen.getByText('வெளிப்புறப் பொருள்')).toBeInTheDocument()
  })

  it('localizes AIAnalysisCard completely with title, mock mode badge, model label, and localized date', async () => {
    const mockAnalysis: AIAnalysis = {
      id: 1,
      food_report: 42,
      status: 'COMPLETED',
      risk: 'HIGH',
      confidence: '0.94',
      concerns: ['foreign_object'],
      message: 'Visible metallic object identified.',
      model_name: 'gemini-mock',
      model_version: '2.0',
      analyzed_at: '2026-03-15T14:30:00Z',
      created_at: '2026-03-15T14:30:00Z',
      updated_at: '2026-03-15T14:30:00Z',
    }

    function AIAnalysisProbe() {
      const { setLanguage } = useLanguage()
      return (
        <div>
          <button onClick={() => setLanguage('te')}>switch to te</button>
          <AIAnalysisCard analysis={mockAnalysis} />
        </div>
      )
    }

    render(
      <LanguageProvider>
        <AIAnalysisProbe />
      </LanguageProvider>,
    )

    // English defaults
    expect(screen.getByText('AI Visual Assessment')).toBeInTheDocument()
    expect(screen.getByText('Mock Mode')).toBeInTheDocument()
    expect(screen.getByText(/Model:/)).toBeInTheDocument()
    expect(screen.getByText(/Analyzed:/)).toBeInTheDocument()
    expect(screen.getByText('High Risk')).toBeInTheDocument()

    // Switch to Telugu
    await userEvent.click(screen.getByText('switch to te'))
    expect(screen.getByText('AI విజువల్ అంచనా')).toBeInTheDocument()
    expect(screen.getByText('మోక్ మోడ్')).toBeInTheDocument()
    expect(screen.getByText(/మోడల్:/)).toBeInTheDocument()
    expect(screen.getByText(/విశ్లేషించబడింది:/)).toBeInTheDocument()
    expect(screen.getByText('అధిక ప్రమాదం')).toBeInTheDocument()
  })

  it('localizes ComplaintTimeline and LinkedReportBadge without any raw enum leakage', async () => {
    const mockComplaint: Complaint = {
      id: 10,
      title: 'Contaminated Biryani',
      description: 'Found plastic piece inside rice.',
      category: 'FOREIGN_OBJECT',
      original_language: 'en',
      status: 'UNDER_REVIEW',
      priority: 'HIGH',
      submitted_at: '2026-03-10T12:00:00Z',
      updated_at: '2026-03-11T09:30:00Z',
      resolved_at: null,
      resolution_notes: '',
      customer: {
        id: 1,
        first_name: 'Rahul',
        last_name: 'Sharma',
        email: 'rahul@example.com',
      },
      restaurant: {
        id: 5,
        name: 'Paradise Biryani',
        city: 'Hyderabad',
        state: 'Telangana',
      },
      food_report: {
        id: 42,
        title: 'Plastic found in curry',
        status: 'SUBMITTED',
      },
    }

    function TimelineProbe() {
      const { setLanguage } = useLanguage()
      return (
        <div>
          <button onClick={() => setLanguage('hi')}>switch to hi</button>
          <button onClick={() => setLanguage('mr')}>switch to mr</button>
          <ComplaintTimeline complaint={mockComplaint} />
          <LinkedReportBadge title={mockComplaint.food_report.title} status={mockComplaint.food_report.status} />
        </div>
      )
    }

    render(
      <LanguageProvider>
        <TimelineProbe />
      </LanguageProvider>,
    )

    // English defaults
    expect(screen.getByText('Submitted')).toBeInTheDocument()
    expect(screen.getByText('Under Review')).toBeInTheDocument()
    expect(screen.getByText('Plastic found in curry · Submitted')).toBeInTheDocument()

    // Switch to Hindi
    await userEvent.click(screen.getByText('switch to hi'))
    expect(screen.getByText('सबमिट किया गया')).toBeInTheDocument()
    expect(screen.getByText('समीक्षाधीन')).toBeInTheDocument()
    expect(screen.getByText('Plastic found in curry · सबमिट किया गया')).toBeInTheDocument()

    // Switch to Marathi
    await userEvent.click(screen.getByText('switch to mr'))
    expect(screen.getByText('सबमिट केले')).toBeInTheDocument()
    expect(screen.getByText('पुनरावलोकनात')).toBeInTheDocument()
    expect(screen.getByText('Plastic found in curry · सबमिट केले')).toBeInTheDocument()
  })

  it('localizes ComplaintOverview with category, filed-by, and description headings', async () => {
    const mockComplaint: Complaint = {
      id: 10,
      title: 'Contaminated Biryani',
      description: 'Found plastic piece inside rice.',
      category: 'FOREIGN_OBJECT',
      original_language: 'en',
      status: 'RESOLVED',
      priority: 'CRITICAL',
      submitted_at: '2026-03-10T12:00:00Z',
      updated_at: '2026-03-11T09:30:00Z',
      resolved_at: '2026-03-12T15:00:00Z',
      resolution_notes: 'Restaurant warned and inspected.',
      customer: {
        id: 1,
        first_name: 'Rahul',
        last_name: 'Sharma',
        email: 'rahul@example.com',
      },
      restaurant: {
        id: 5,
        name: 'Paradise Biryani',
        city: 'Hyderabad',
        state: 'Telangana',
      },
      food_report: {
        id: 42,
        title: 'Plastic in rice',
        status: 'RESOLVED',
      },
    }

    function OverviewProbe() {
      const { setLanguage } = useLanguage()
      return (
        <MemoryRouter>
          <button onClick={() => setLanguage('te')}>switch to te</button>
          <ComplaintOverview complaint={mockComplaint} showCustomer reportLinkBase="/reports" />
        </MemoryRouter>
      )
    }

    render(
      <LanguageProvider>
        <OverviewProbe />
      </LanguageProvider>,
    )

    // English defaults
    expect(screen.getByText('Foreign Object')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Resolution Notes')).toBeInTheDocument()
    expect(screen.getByText(/Filed by Rahul Sharma/)).toBeInTheDocument()

    // Switch to Telugu
    await userEvent.click(screen.getByText('switch to te'))
    expect(screen.getByText('అవాంఛిత వస్తువు')).toBeInTheDocument()
    expect(screen.getByText('వివరణ')).toBeInTheDocument()
    expect(screen.getByText('పరిష్కార వివరాలు')).toBeInTheDocument()
    expect(screen.getByText(/Rahul Sharma.*ద్వారా దాఖలు చేయబడింది/)).toBeInTheDocument()
  })

  it('localizes Customer Profile page into Telugu, Tamil, and Hindi without reload', async () => {
    function ProfileProbe() {
      const { setLanguage } = useLanguage()
      return (
        <MemoryRouter>
          <button onClick={() => setLanguage('te')}>switch to te</button>
          <button onClick={() => setLanguage('ta')}>switch to ta</button>
          <button onClick={() => setLanguage('hi')}>switch to hi</button>
          <Profile />
        </MemoryRouter>
      )
    }

    render(
      <LanguageProvider>
        <ProfileProbe />
      </LanguageProvider>,
    )

    // English defaults
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Phone')).toBeInTheDocument()
    expect(screen.getByText('Preferred language')).toBeInTheDocument()
    expect(screen.getByText('Member since')).toBeInTheDocument()
    expect(screen.getByText(/Profile details are managed by FoodGuard AI administrators/)).toBeInTheDocument()

    // Switch to Telugu
    await userEvent.click(screen.getByText('switch to te'))
    expect(screen.getByText('ఈమెయిల్')).toBeInTheDocument()
    expect(screen.getByText('ఫోన్')).toBeInTheDocument()
    expect(screen.getByText('ప్రాధాన్య భాష')).toBeInTheDocument()
    expect(screen.getByText('చేరిన తేదీ')).toBeInTheDocument()
    expect(screen.getByText('ఇంగ్లీష్ (English)')).toBeInTheDocument()
    expect(screen.getByText(/ప్రొఫైల్ వివరాలు FoodGuard AI నిర్వాహకులచే నిర్వహించబడతాయి/)).toBeInTheDocument()

    // Switch to Tamil
    await userEvent.click(screen.getByText('switch to ta'))
    expect(screen.getByText('மின்னஞ்சல்')).toBeInTheDocument()
    expect(screen.getByText('தொலைபேசி')).toBeInTheDocument()
    expect(screen.getByText('விருப்பமான மொழி')).toBeInTheDocument()
    expect(screen.getByText('உறுப்பினர் தொடக்கம்')).toBeInTheDocument()
    expect(screen.getByText('ஆங்கிலம் (English)')).toBeInTheDocument()
    expect(screen.getByText(/சுயவிவர விவரங்கள் FoodGuard AI நிர்வாகிகளால் நிர்வகிக்கப்படுகின்றன/)).toBeInTheDocument()

    // Switch to Hindi
    await userEvent.click(screen.getByText('switch to hi'))
    expect(screen.getByText('ईमेल')).toBeInTheDocument()
    expect(screen.getByText('फ़ोन')).toBeInTheDocument()
    expect(screen.getByText('पसंदीदा भाषा')).toBeInTheDocument()
    expect(screen.getByText('सदस्यता आरंभ')).toBeInTheDocument()
    expect(screen.getByText('अंग्रेज़ी (English)')).toBeInTheDocument()
    expect(screen.getByText(/प्रोफ़ाइल विवरण FoodGuard AI व्यवस्थापकों द्वारा प्रबंधित किए जाते हैं/)).toBeInTheDocument()
  })
})
