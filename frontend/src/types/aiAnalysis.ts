export type AnalysisStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'HUMAN_REVIEW'

export interface AIAnalysis {
  id: number
  food_report: number
  status: AnalysisStatus
  risk: RiskLevel
  /** DRF DecimalField — arrives as a string, e.g. "0.000" */
  confidence: string
  concerns: string[]
  message: string
  analyzed_at: string | null
  model_name: string
  model_version: string
  created_at: string
  updated_at: string
}
