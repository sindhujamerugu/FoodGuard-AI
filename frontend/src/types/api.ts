/** Shape of DRF validation error responses: field name -> list of messages, or {detail: ...} */
export type ApiErrorBody = Record<string, string[] | string> & { detail?: string | string[] }

export interface ApiError {
  status: number
  body: ApiErrorBody | null
  message: string
}
