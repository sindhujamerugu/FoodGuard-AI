/**
 * ComplaintWizard — 5-step guided complaint registration.
 *
 * Bugs fixed in this version
 * --------------------------
 * BUG 1 — Submit stuck / success screen never shown:
 *   Root cause: `setSuccessReportId(id)` and `dispatch({ type: 'NEXT' })` are
 *   two separate async state updates. React may batch them, but the render that
 *   checks `state.step > TOTAL_STEPS && successReportId !== null` can fire before
 *   both are committed, so the success screen guard fails.
 *   Fix: single `useState<SuccessResult | null>` set once — no step counter needed
 *   to gate the success screen. We show it when successResult is non-null.
 *
 * BUG 2 — Location status resets on every parent re-render:
 *   Root cause: LocationStep has its own local `geoStatus` useState. The parent
 *   wizard re-renders whenever *any* field changes (useReducer dispatch). React
 *   reconciles `<Reveal key="s4">` and may remount LocationStep, resetting
 *   geoStatus back to 'idle' and losing the captured coordinates display.
 *   Fix: lift `geoStatus` into the main reducer so it persists across re-renders.
 *   LocationStep now receives geoStatus as a prop and updates it via dispatch.
 *
 * API flow (unchanged)
 * --------------------
 *   POST /api/v1/reports/            → create DRAFT report (with image)
 *   POST /api/v1/reports/:id/submit/ → DRAFT → SUBMITTED
 *   POST /api/v1/complaints/         → file complaint against submitted report
 *
 * Location storage
 * ----------------
 *   The Complaint model has no lat/lng columns. Location is appended to the
 *   report description as plain text: "📍 Location: lat, lng". This is the
 *   intended behaviour — no backend changes required.
 */
import { useReducer, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { ImageUploader } from '@/components/upload/ImageUploader'
import { RestaurantSearchSelect } from '@/components/restaurants/RestaurantSearchSelect'
import { useCreateReport } from '@/hooks/useReports'
import { useCreateComplaint } from '@/hooks/useComplaints'
import { useRestaurants } from '@/hooks/useRestaurants'
import { useTranslation } from '@/i18n/LanguageContext'
import { cn } from '@/lib/cn'
import { toApiError } from '@/types/errors'
import { http } from '@/lib/http'
import type { ComplaintCategory } from '@/types/complaint'

// ── Types ─────────────────────────────────────────────────────────────────────

type GeoStatus = 'idle' | 'capturing' | 'captured' | 'denied' | 'unavailable' | 'timeout'

interface WizardState {
  step: number
  // Step 1
  foodItem: string
  restaurantId: string
  // Step 2
  category: ComplaintCategory | ''
  title: string
  description: string
  incidentDate: string
  // Step 3
  image: File | null
  // Step 4 — geoStatus lifted here to survive parent re-renders
  geoStatus: GeoStatus
  locationLat: number | null
  locationLng: number | null
  // Validation errors
  errors: Record<string, string>
}

type WizardAction =
  | { type: 'SET'; field: keyof WizardState; value: unknown }
  | { type: 'SET_GEO'; status: GeoStatus; lat?: number; lng?: number }
  | { type: 'CLEAR_GEO' }
  | { type: 'SET_ERRORS'; errors: Record<string, string> }
  | { type: 'NEXT' }
  | { type: 'BACK' }

const TOTAL_STEPS = 5

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET':
      // Don't wipe errors when updating geo fields — they're not form fields
      return { ...state, [action.field]: action.value }
    case 'SET_GEO':
      return {
        ...state,
        geoStatus:   action.status,
        locationLat: action.lat  ?? state.locationLat,
        locationLng: action.lng  ?? state.locationLng,
      }
    case 'CLEAR_GEO':
      return { ...state, geoStatus: 'idle', locationLat: null, locationLng: null }
    case 'SET_ERRORS':
      return { ...state, errors: action.errors }
    case 'NEXT':
      return { ...state, step: Math.min(state.step + 1, TOTAL_STEPS), errors: {} }
    case 'BACK':
      return { ...state, step: Math.max(state.step - 1, 1), errors: {} }
    default:
      return state
  }
}

const INITIAL: WizardState = {
  step: 1,
  foodItem: '',
  restaurantId: '',
  category: '',
  title: '',
  description: '',
  incidentDate: '',
  image: null,
  geoStatus: 'idle',
  locationLat: null,
  locationLng: null,
  errors: {},
}

// ── Success result type ───────────────────────────────────────────────────────

interface SuccessResult {
  reportId: number
  complaintId: number
}

// ── Categories ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: ComplaintCategory; labelKey: string }[] = [
  { value: 'FOOD_QUALITY',   labelKey: 'category.foodQuality' },
  { value: 'SPOILAGE',       labelKey: 'category.spoilage' },
  { value: 'FOREIGN_OBJECT', labelKey: 'category.foreignObject' },
  { value: 'HYGIENE',        labelKey: 'category.hygiene' },
  { value: 'TASTE_OR_ODOR',  labelKey: 'category.tasteOrOdor' },
  { value: 'OTHER',          labelKey: 'category.other' },
]

// ── Step stepper ──────────────────────────────────────────────────────────────

const STEP_META = [
  { icon: FileText,     labelKey: 'wizard.step1Title' },
  { icon: MessageSquare,labelKey: 'wizard.step2Title' },
  { icon: Upload,       labelKey: 'wizard.step3Title' },
  { icon: MapPin,       labelKey: 'wizard.step4Title' },
  { icon: ShieldCheck,  labelKey: 'wizard.step5Title' },
]

function Stepper({ current }: { current: number }) {
  const t = useTranslation()
  return (
    <div className="mb-8">
      {/* Step dots + connectors */}
      <div className="flex items-center">
        {STEP_META.map(({ icon: Icon }, i) => {
          const step   = i + 1
          const done   = step < current
          const active = step === current
          return (
            <div key={step} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'flex size-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                    done   && 'border-primary-600 bg-primary-600 text-white shadow-sm',
                    active && 'border-primary-600 bg-white text-primary-600 shadow-md shadow-primary-100 ring-4 ring-primary-50',
                    !done && !active && 'border-neutral-200 bg-white text-neutral-400',
                  )}
                >
                  {done
                    ? <CheckCircle2 className="size-4.5" aria-hidden="true" />
                    : <Icon className="size-4.5" aria-hidden="true" />
                  }
                </div>
              </div>
              {i < TOTAL_STEPS - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-1 rounded-full transition-all duration-500',
                    step < current ? 'bg-primary-500' : 'bg-neutral-200',
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Current step label */}
      <div className="mt-3 flex items-center justify-between px-1">
        <p className="text-sm font-semibold text-primary-900">
          {t(STEP_META[current - 1].labelKey as any)}
        </p>
        <p className="text-xs text-neutral-400">
          {t('wizard.step')} {current} / {TOTAL_STEPS}
        </p>
      </div>
    </div>
  )
}

// ── Location step ─────────────────────────────────────────────────────────────

/**
 * Location status is in the reducer (not local state) so it survives
 * re-renders of the parent wizard without resetting back to 'idle'.
 */
function LocationStep({
  state,
  dispatch,
}: {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
}) {
  const t = useTranslation()
  const { geoStatus, locationLat, locationLng } = state

  function requestLocation() {
    if (!navigator.geolocation) {
      dispatch({ type: 'SET_GEO', status: 'unavailable' })
      return
    }
    dispatch({ type: 'SET_GEO', status: 'capturing' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        dispatch({
          type:   'SET_GEO',
          status: 'captured',
          lat:    pos.coords.latitude,
          lng:    pos.coords.longitude,
        })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED)   dispatch({ type: 'SET_GEO', status: 'denied' })
        else if (err.code === err.TIMEOUT)        dispatch({ type: 'SET_GEO', status: 'timeout' })
        else                                      dispatch({ type: 'SET_GEO', status: 'unavailable' })
      },
      { timeout: 15_000, maximumAge: 0, enableHighAccuracy: true },
    )
  }

  function clearLocation() {
    dispatch({ type: 'CLEAR_GEO' })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-primary-900">{t('wizard.step4Title')}</h2>
        <p className="mt-1 text-sm text-neutral-500">{t('wizard.step4Subtitle')}</p>
      </div>

      {/* Main card */}
      <div className="flex flex-col items-center gap-5 rounded-2xl border-2 border-dashed border-neutral-200 bg-white p-8 text-center">

        {/* Icon */}
        <div className={cn(
          'flex size-16 items-center justify-center rounded-2xl transition-colors duration-300',
          geoStatus === 'captured' ? 'bg-success-100 text-success-600' : 'bg-primary-50 text-primary-600',
        )}>
          <MapPin className="size-8" aria-hidden="true" />
        </div>

        {/* IDLE — show allow button */}
        {geoStatus === 'idle' && (
          <>
            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-700">
                Share your current location
              </p>
              <p className="max-w-xs text-xs text-neutral-500">
                This helps the Food Safety Officer identify the exact area.
                Your location is never shared publicly and is completely optional.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" size="sm" onClick={requestLocation}>
                <MapPin className="size-4" aria-hidden="true" />
                {t('wizard.locationAllow')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => dispatch({ type: 'SET', field: 'geoStatus', value: 'idle' })}
              >
                {t('wizard.skip')} this step
              </Button>
            </div>
          </>
        )}

        {/* CAPTURING — spinner */}
        {geoStatus === 'capturing' && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary-500" aria-hidden="true" />
            <p className="text-sm text-neutral-500 animate-pulse">{t('wizard.locationCapturing')}</p>
          </div>
        )}

        {/* CAPTURED — show coordinates */}
        {geoStatus === 'captured' && locationLat !== null && locationLng !== null && (
          <div className="w-full space-y-4">
            <div className="flex items-center justify-center gap-2 text-success-700">
              <CheckCircle2 className="size-5" aria-hidden="true" />
              <span className="text-sm font-semibold">{t('wizard.locationCaptured')}</span>
            </div>

            {/* Coordinate display — REAL values from browser */}
            <div className="rounded-xl border border-success-200 bg-success-50 p-4 text-left">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-success-600">
                Location captured from your browser
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white p-2.5 shadow-sm">
                  <p className="text-xs text-neutral-500">Latitude</p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-neutral-900">
                    {locationLat.toFixed(6)}
                  </p>
                </div>
                <div className="rounded-lg bg-white p-2.5 shadow-sm">
                  <p className="text-xs text-neutral-500">Longitude</p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-neutral-900">
                    {locationLng.toFixed(6)}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-neutral-400 text-center">
                These coordinates come directly from your device's GPS/network — not from your photo.
              </p>
            </div>

            <button
              type="button"
              onClick={clearLocation}
              className="text-xs text-neutral-400 hover:text-neutral-600 underline-offset-2 hover:underline transition-colors"
            >
              Clear and skip location
            </button>
          </div>
        )}

        {/* DENIED */}
        {geoStatus === 'denied' && (
          <div className="w-full space-y-3">
            <div className="flex items-center gap-2 text-warning-700">
              <AlertCircle className="size-5" aria-hidden="true" />
              <span className="text-sm font-medium">Location permission denied</span>
            </div>
            <p className="text-xs text-neutral-500 max-w-xs">
              {t('wizard.locationDenied')}
              <br />
              To allow location, update your browser's site permissions and try again.
            </p>
            <Button type="button" size="sm" variant="outline" onClick={requestLocation}>
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Try again
            </Button>
          </div>
        )}

        {/* TIMEOUT */}
        {geoStatus === 'timeout' && (
          <div className="w-full space-y-3">
            <div className="flex items-center gap-2 text-warning-700">
              <AlertCircle className="size-5" aria-hidden="true" />
              <span className="text-sm font-medium">Location request timed out</span>
            </div>
            <p className="text-xs text-neutral-500">
              Could not determine your location within 15 seconds. Check your GPS signal and try again.
            </p>
            <Button type="button" size="sm" variant="outline" onClick={requestLocation}>
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Retry
            </Button>
          </div>
        )}

        {/* UNAVAILABLE */}
        {geoStatus === 'unavailable' && (
          <div className="w-full space-y-3">
            <div className="flex items-center gap-2 text-warning-700">
              <AlertCircle className="size-5" aria-hidden="true" />
              <span className="text-sm font-medium">
                {!navigator.geolocation
                  ? 'Geolocation is not supported by this browser'
                  : 'Location unavailable'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 max-w-xs">
              {t('wizard.locationUnavailable')}
            </p>
            {navigator.geolocation && (
              <Button type="button" size="sm" variant="outline" onClick={requestLocation}>
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Retry
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Skip notice */}
      {(geoStatus === 'idle' || geoStatus === 'denied' || geoStatus === 'unavailable' || geoStatus === 'timeout') && (
        <p className="rounded-lg bg-neutral-50 px-3 py-2.5 text-center text-xs text-neutral-500">
          Location is optional. You can click <strong>Continue</strong> to skip this step.
        </p>
      )}
    </div>
  )
}

// ── Review row ────────────────────────────────────────────────────────────────

function ReviewRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  if (!value || value === '—') return null
  return (
    <div className="flex flex-col gap-0.5 border-b border-neutral-100 py-3 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</span>
      <span className={cn('text-sm text-neutral-800', mono && 'font-mono')}>{value}</span>
    </div>
  )
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function ComplaintWizard() {
  const t        = useTranslation()
  const navigate = useNavigate()

  const [state, dispatch]             = useReducer(reducer, INITIAL)
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // FIX: single atomic success state — not split across reducer + useState
  const [successResult, setSuccessResult] = useState<SuccessResult | null>(null)

  // Duplicate-submission guard — a ref (not state) so it never causes
  // an extra render and can't be reset by a React batched update.
  // If handleSubmit is called while already in-flight, we return immediately.
  const submittingRef = useRef(false)

  const createReport    = useCreateReport()
  const createComplaint = useCreateComplaint()
  const { data: restaurants } = useRestaurants()

  const selectedRestaurantName =
    restaurants?.find(r => String(r.id) === state.restaurantId)?.name ?? ''

  // ── Per-step validation ────────────────────────────────────────────

  function validateStep(step: number): boolean {
    const errs: Record<string, string> = {}

    if (step === 1) {
      if (!state.foodItem.trim())  errs.foodItem     = t('validation.foodItemRequired')
      if (!state.restaurantId)     errs.restaurantId = t('validation.selectRestaurant')
    }

    if (step === 2) {
      if (!state.category)           errs.category    = t('validation.descriptionRequired')
      if (!state.title.trim())       errs.title       = t('validation.titleRequired')
      if (!state.description.trim()) errs.description = t('validation.descriptionRequired')
      if (!state.incidentDate)       errs.incidentDate = t('validation.incidentDateRequired')
    }

    if (Object.keys(errs).length > 0) {
      dispatch({ type: 'SET_ERRORS', errors: errs })
      return false
    }
    return true
  }

  function handleNext() {
    if (validateStep(state.step)) dispatch({ type: 'NEXT' })
  }

  // ── Submit — double-click / concurrent-call safe ──────────────────

  async function handleSubmit() {
    // Guard: if already submitting (e.g. rapid double-click before React
    // disables the button), bail out immediately.
    if (submittingRef.current) return
    submittingRef.current = true

    setSubmitError(null)
    setSubmitting(true)
    try {
      // 1 — Create DRAFT report.
      //   location_lat / location_lng are passed as separate API fields so the
      //   backend stores them in the dedicated NUMERIC columns, not inside the
      //   description text.  When the customer skipped location both are null
      //   and toFormData() omits them → backend stores NULL (nullable column).
      const report = await createReport.mutateAsync({
        restaurant:   Number(state.restaurantId),
        title:        state.foodItem.trim(),
        description:  state.description.trim(),
        image:        state.image ?? undefined,
        location_lat: state.locationLat ?? null,
        location_lng: state.locationLng ?? null,
      })

      // 2 — Submit report (DRAFT → SUBMITTED)
      await http.post(`/reports/${report.id}/submit/`)

      // 3 — File complaint against submitted report
      const complaint = await createComplaint.mutateAsync({
        food_report: report.id,
        title:       state.title.trim(),
        description: state.description.trim(),
        category:    state.category as ComplaintCategory,
      })

      // FIX: Set success atomically in a single setState call.
      // Do NOT call dispatch(NEXT) — the success screen is gated on
      // successResult !== null, not on the reducer step count.
      setSuccessResult({ reportId: report.id, complaintId: complaint.id })

    } catch (err) {
      const message = toApiError(err).message
      setSubmitError(message || 'Submission failed. Please try again.')
    } finally {
      submittingRef.current = false   // allow retry after failure
      setSubmitting(false)
    }
  }

  // ── Success screen ─────────────────────────────────────────────────

  if (successResult !== null) {
    return (
      <AppShell title={t('wizard.title')}>
        <div className="mx-auto max-w-lg py-12 text-center">
          {/* Success icon */}
          <div className="mx-auto mb-6 flex size-24 items-center justify-center rounded-full bg-success-100">
            <CheckCircle2 className="size-12 text-success-600" aria-hidden="true" />
          </div>

          <h2 className="text-2xl font-bold text-primary-900">{t('wizard.successTitle')}</h2>
          <p className="mt-2 text-base text-neutral-500">{t('wizard.successDesc')}</p>

          {/* Reference number card */}
          <div className="mt-8 rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-500">
              {t('wizard.successRef')}
            </p>
            <p className="mt-1 text-5xl font-black tracking-tight text-primary-800">
              #{successResult.reportId}
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              Complaint ID: #{successResult.complaintId}
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              Keep this reference number for your records.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to={`/reports/${successResult.reportId}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
            >
              {t('wizard.viewReport')}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              to={`/complaints/${successResult.complaintId}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              View Complaint
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-6 py-3 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-50"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  // ── Wizard layout ──────────────────────────────────────────────────

  return (
    <AppShell title={t('wizard.title')}>
      <div className="mx-auto max-w-2xl">

        {/* Stepper */}
        <Stepper current={state.step} />

        {/* Step panel */}
        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm">

          <div className="p-6 sm:p-8">

            {/* ── Step 1: Food & Restaurant ── */}
            {state.step === 1 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-primary-900">{t('wizard.step1Title')}</h2>
                  <p className="mt-1 text-sm text-neutral-500">{t('wizard.step1Subtitle')}</p>
                </div>
                <div className="space-y-5">
                  <Input
                    label={t('wizard.foodItemLabel')}
                    required
                    placeholder={t('wizard.foodItemPlaceholder')}
                    value={state.foodItem}
                    onChange={e => dispatch({ type: 'SET', field: 'foodItem', value: e.target.value })}
                    error={state.errors.foodItem}
                  />
                  <RestaurantSearchSelect
                    value={state.restaurantId}
                    onChange={id => dispatch({ type: 'SET', field: 'restaurantId', value: id })}
                    error={state.errors.restaurantId}
                  />
                </div>
              </div>
            )}

            {/* ── Step 2: Complaint Details ── */}
            {state.step === 2 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-primary-900">{t('wizard.step2Title')}</h2>
                  <p className="mt-1 text-sm text-neutral-500">{t('wizard.step2Subtitle')}</p>
                </div>
                <div className="space-y-5">
                  {/* Category */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                      {t('complaints.create.categoryLabel')}
                      <span className="ml-1 text-danger-500" aria-hidden="true">*</span>
                    </label>
                    <Select
                      value={state.category}
                      onChange={e => dispatch({ type: 'SET', field: 'category', value: e.target.value })}
                    >
                      <option value="" disabled>Select a category…</option>
                      {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{t(c.labelKey as any)}</option>
                      ))}
                    </Select>
                    {state.errors.category && (
                      <p role="alert" className="mt-1 text-xs text-danger-600">{state.errors.category}</p>
                    )}
                  </div>

                  <Input
                    label={t('complaints.create.titleLabel')}
                    required
                    value={state.title}
                    onChange={e => dispatch({ type: 'SET', field: 'title', value: e.target.value })}
                    error={state.errors.title}
                  />

                  <Textarea
                    label={t('complaints.create.descriptionLabel')}
                    required
                    rows={4}
                    value={state.description}
                    onChange={e => dispatch({ type: 'SET', field: 'description', value: e.target.value })}
                    error={state.errors.description}
                  />

                  <Input
                    label={t('wizard.incidentDateLabel')}
                    required
                    type="datetime-local"
                    value={state.incidentDate}
                    onChange={e => dispatch({ type: 'SET', field: 'incidentDate', value: e.target.value })}
                    error={state.errors.incidentDate}
                  />
                </div>
              </div>
            )}

            {/* ── Step 3: Evidence Upload ── */}
            {state.step === 3 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-primary-900">{t('wizard.step3Title')}</h2>
                  <p className="mt-1 text-sm text-neutral-500">{t('wizard.step3Subtitle')}</p>
                </div>
                <ImageUploader
                  file={state.image}
                  onChange={file => dispatch({ type: 'SET', field: 'image', value: file })}
                  hint={t('reports.form.imageHint')}
                />
                <p className="mt-4 rounded-lg bg-neutral-50 px-3 py-2.5 text-xs text-neutral-500">
                  <strong>Note:</strong> uploading a photo does not automatically determine your location.
                  You will be asked for location separately on the next step.
                </p>
              </div>
            )}

            {/* ── Step 4: Location ── */}
            {/* No Reveal wrapper / no key change — LocationStep receives
                geoStatus from reducer so it never remounts and loses state */}
            {state.step === 4 && (
              <LocationStep state={state} dispatch={dispatch} />
            )}

            {/* ── Step 5: Review & Submit ── */}
            {state.step === 5 && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-primary-900">{t('wizard.step5Title')}</h2>
                  <p className="mt-1 text-sm text-neutral-500">{t('wizard.step5Subtitle')}</p>
                </div>

                <div className="rounded-xl border border-neutral-100 bg-neutral-25 px-4 py-2">
                  <ReviewRow label={t('wizard.foodItemLabel')}               value={state.foodItem} />
                  <ReviewRow label={t('restaurantSelect.label')}             value={selectedRestaurantName} />
                  <ReviewRow label={t('complaints.create.categoryLabel')}    value={state.category} />
                  <ReviewRow label={t('complaints.create.titleLabel')}       value={state.title} />
                  <ReviewRow label={t('complaints.create.descriptionLabel')} value={state.description} />
                  <ReviewRow label={t('wizard.incidentDateLabel')}           value={state.incidentDate} />
                  <ReviewRow
                    label="Evidence photo"
                    value={state.image ? state.image.name : '—'}
                  />
                  <ReviewRow
                    label="Location"
                    mono
                    value={
                      state.locationLat !== null && state.locationLng !== null
                        ? `Lat ${state.locationLat.toFixed(6)}, Lng ${state.locationLng.toFixed(6)}`
                        : 'Not provided (optional)'
                    }
                  />
                </div>

                {/* Error banner */}
                {submitError && (
                  <div
                    role="alert"
                    className="mt-4 flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3"
                  >
                    <AlertCircle className="mt-0.5 size-4.5 shrink-0 text-danger-600" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium text-danger-800">Submission failed</p>
                      <p className="mt-0.5 text-sm text-danger-700">{submitError}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Navigation bar ── */}
          <div className="flex items-center justify-between border-t border-neutral-100 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => dispatch({ type: 'BACK' })}
              disabled={state.step === 1 || submitting}
            >
              {t('wizard.back')}
            </Button>

            {state.step < TOTAL_STEPS ? (
              <Button onClick={handleNext} disabled={submitting}>
                {t('wizard.next')}
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                isLoading={submitting}
                className="min-w-[140px]"
              >
                {submitting ? t('wizard.submitting') : t('wizard.submit')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
