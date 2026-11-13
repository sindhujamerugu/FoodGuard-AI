import { useMemo, useState } from 'react'
import L from 'leaflet'
import { AlertTriangle, ExternalLink, MapPin, Navigation } from 'lucide-react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { useTranslation } from '@/i18n'

function parseCoordinate(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function isValidCoordinates(latitude: number | null, longitude: number | null): boolean {
  if (latitude === null || longitude === null) return false
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
}

function buildExternalMapUrl(latitude: number, longitude: number): string {
  const lat = latitude.toFixed(6)
  const lng = longitude.toFixed(6)
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`
}

export function ComplaintLocationMapCard({
  latitude,
  longitude,
  locationName,
  locationDescription,
  className = '',
}: {
  latitude: string | number | null | undefined
  longitude: string | number | null | undefined
  locationName?: string | null
  locationDescription?: string | null
  className?: string
}) {
  const { t } = useTranslation()
  const [mapError, setMapError] = useState(false)

  const parsedLatitude = parseCoordinate(latitude)
  const parsedLongitude = parseCoordinate(longitude)
  const hasLocation = isValidCoordinates(parsedLatitude, parsedLongitude)
  const externalMapUrl = hasLocation ? buildExternalMapUrl(parsedLatitude!, parsedLongitude!) : null

  const markerIcon = useMemo(
    () =>
      L.divIcon({
        className: 'complaint-location-pin',
        html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;border:3px solid #ffffff;background:#176B4D;box-shadow:0 0 0 3px rgba(23,107,77,0.18);"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
    [],
  )

  if (!hasLocation) {
    return (
      <div className={`rounded-2xl border border-neutral-200 bg-white p-5 shadow-card ${className}`} data-testid="location-fallback">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
            <MapPin className="size-4" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-900">{t('complaint.location.heading')}</h3>
        </div>

        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-center">
          <MapPin className="mx-auto size-5 text-neutral-400" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-neutral-700">{t('complaint.location.unavailable')}</p>
          <p className="mt-1 text-xs text-neutral-500">{t('complaint.location.unavailableText')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border border-neutral-200 bg-white p-5 shadow-card ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
            <MapPin className="size-4" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-900">{t('complaint.location.heading')}</h3>
        </div>

        {externalMapUrl && (
          <a
            href={externalMapUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
          >
            <Navigation className="size-3.5" aria-hidden="true" />
            {t('complaint.location.viewExternal')}
          </a>
        )}
      </div>

      {mapError ? (
        <div className="rounded-xl border border-warning-200 bg-warning-50 p-4 text-center" data-testid="location-map-error">
          <AlertTriangle className="mx-auto size-5 text-warning-600" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-warning-700">{t('complaint.location.mapError')}</p>
          <p className="mt-1 text-xs text-warning-700/80">{t('complaint.location.mapErrorText')}</p>
          {externalMapUrl && (
            <a
              href={externalMapUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-warning-700 hover:underline"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              {t('complaint.location.openInMap')}
            </a>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
          <MapContainer
            center={[parsedLatitude!, parsedLongitude!]}
            zoom={15}
            scrollWheelZoom
            className="h-64 w-full"
            data-testid="location-map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              eventHandlers={{
                tileerror: () => setMapError(true),
              }}
              data-testid="map-tile-layer"
            />
            <Marker position={[parsedLatitude!, parsedLongitude!]} icon={markerIcon}>
              <Popup>
                {locationName ?? t('complaint.location.heading')}
                <br />
                {parsedLatitude!.toFixed(6)}, {parsedLongitude!.toFixed(6)}
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            {t('complaint.location.latitude')}
          </div>
          <div className="mt-1 font-mono text-sm font-medium text-neutral-900">
            {parsedLatitude!.toFixed(6)}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            {t('complaint.location.longitude')}
          </div>
          <div className="mt-1 font-mono text-sm font-medium text-neutral-900">
            {parsedLongitude!.toFixed(6)}
          </div>
        </div>
      </div>

      {locationDescription && (
        <div className="mt-4 rounded-xl border border-neutral-100 bg-primary-50/40 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            {t('complaint.location.address')}
          </div>
          <p className="mt-1 text-sm text-neutral-700">{locationDescription}</p>
        </div>
      )}
    </div>
  )
}
