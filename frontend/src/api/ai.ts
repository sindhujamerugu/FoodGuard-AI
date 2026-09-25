import { http } from '@/lib/http'
import type { AIAnalysis } from '@/types/aiAnalysis'

export const aiApi = {
  run: (reportId: number) =>
    http.post<AIAnalysis>(`/reports/${reportId}/analyze/`).then((r) => r.data),

  get: (reportId: number) =>
    http.get<AIAnalysis>(`/reports/${reportId}/analysis/`).then((r) => r.data),
}
