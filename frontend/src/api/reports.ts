import { http } from '@/lib/http'
import type { FoodReport, FoodReportCreatePayload, FoodReportUpdatePayload } from '@/types/report'

function toFormData(payload: FoodReportCreatePayload | FoodReportUpdatePayload): FormData {
  const form = new FormData()

  if ('restaurant' in payload && payload.restaurant !== undefined) {
    form.append('restaurant', String(payload.restaurant))
  }
  if (payload.title !== undefined)        form.append('title', payload.title)
  if (payload.description !== undefined)  form.append('description', payload.description)
  if (payload.image)                      form.append('image', payload.image)

  // Location coordinates — only append when both are non-null numbers.
  // The backend serializer requires both or neither, so we never send one
  // without the other. Null / undefined → field simply omitted → backend
  // stores NULL (nullable column).
  if (payload.location_lat != null && payload.location_lng != null) {
    form.append('location_lat', String(payload.location_lat))
    form.append('location_lng', String(payload.location_lng))
  }

  return form
}

export const reportsApi = {
  list: () => http.get<FoodReport[]>('/reports/').then((r) => r.data),

  get: (id: number) => http.get<FoodReport>(`/reports/${id}/`).then((r) => r.data),

  create: (payload: FoodReportCreatePayload) =>
    http
      .post<FoodReport>('/reports/', toFormData(payload), {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),

  update: (id: number, payload: FoodReportUpdatePayload) =>
    http
      .patch<FoodReport>(`/reports/${id}/`, toFormData(payload), {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),

  remove: (id: number) => http.delete(`/reports/${id}/`).then((r) => r.data),

  submit: (id: number) => http.post<FoodReport>(`/reports/${id}/submit/`).then((r) => r.data),
}
