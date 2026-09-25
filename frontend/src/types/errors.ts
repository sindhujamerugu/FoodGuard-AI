import axios from 'axios'
import type { ApiError, ApiErrorBody } from './api'

/** Normalizes an unknown thrown value (ideally an AxiosError) into a stable ApiError shape. */
export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0
    const body = (error.response?.data as ApiErrorBody | undefined) ?? null
    return {
      status,
      body,
      message: extractMessage(body) ?? error.message ?? 'Something went wrong.',
    }
  }
  return {
    status: 0,
    body: null,
    message: error instanceof Error ? error.message : 'Something went wrong.',
  }
}

function extractMessage(body: ApiErrorBody | null): string | undefined {
  if (!body) return undefined
  if (body.detail) {
    return Array.isArray(body.detail) ? body.detail.join(' ') : body.detail
  }
  const firstField = Object.values(body)[0]
  if (Array.isArray(firstField)) return firstField.join(' ')
  if (typeof firstField === 'string') return firstField
  return undefined
}
