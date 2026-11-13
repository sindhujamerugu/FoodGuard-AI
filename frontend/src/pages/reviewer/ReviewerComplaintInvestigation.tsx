import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, ShieldAlert, Sparkles } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { ErrorState } from '@/components/states/ErrorState'
import { useComplaint } from '@/hooks/useComplaints'
import {
  useComplaintInvestigation,
  useComplaintInvestigationHistory,
  useCompleteComplaintInvestigation,
  useStartComplaintInvestigation,
  useUpdateComplaintInvestigation,
} from '@/hooks/useComplaintInvestigation'
import { formatDateTime } from '@/lib/format'
import type {
  ComplaintInvestigation,
  ComplaintInvestigationFormPayload,
  InvestigationRecommendation,
  InvestigationStatus,
} from '@/types/complaint'

const EMPTY_FORM: ComplaintInvestigationFormPayload = {
  summary: '',
  findings: '',
  observations: '',
  evidence_review_notes: '',
  actions_taken: '',
  recommendation: '',
  remarks: '',
  status: 'IN_PROGRESS',
}

function getRecommendationLabel(recommendation: string) {
  const map: Record<string, string> = {
    RESOLVE_COMPLAINT: 'Resolve complaint',
    REJECT_COMPLAINT: 'Reject complaint',
    ESCALATE_COMPLAINT: 'Escalate complaint',
    REQUEST_MORE_INFORMATION: 'Request more information',
  }

  return map[recommendation] ?? 'Select recommendation'
}

export default function ReviewerComplaintInvestigation() {
  const { id } = useParams<{ id: string }>()
  const complaintId = Number(id)

  const complaintQuery = useComplaint(complaintId)
  const investigationQuery = useComplaintInvestigation(complaintId)
  const investigationHistoryQuery = useComplaintInvestigationHistory(complaintId)
  const startInvestigation = useStartComplaintInvestigation(complaintId)
  const updateInvestigation = useUpdateComplaintInvestigation(complaintId)
  const completeInvestigation = useCompleteComplaintInvestigation(complaintId)

  const [form, setForm] = useState<ComplaintInvestigationFormPayload>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const inquiry = investigationQuery.data
  const hasInvestigation = !!(inquiry && typeof inquiry === 'object' && 'id' in inquiry)
  const notStarted = !!(
    inquiry &&
    typeof inquiry === 'object' &&
    'status' in inquiry &&
    inquiry.status === 'NOT_STARTED'
  )

  useEffect(() => {
    if (!hasInvestigation) {
      setForm(EMPTY_FORM)
      return
    }

    const investigation = inquiry as ComplaintInvestigation
    setForm({
      summary: investigation.summary ?? '',
      findings: investigation.findings ?? '',
      observations: investigation.observations ?? '',
      evidence_review_notes: investigation.evidence_review_notes ?? '',
      actions_taken: investigation.actions_taken ?? '',
      recommendation: investigation.recommendation ?? '',
      remarks: investigation.remarks ?? '',
      status: investigation.status ?? 'IN_PROGRESS',
    })
  }, [hasInvestigation, inquiry])

  const historyEntries = useMemo(() => investigationHistoryQuery.data ?? [], [investigationHistoryQuery.data])

  const updateField = (field: keyof ComplaintInvestigationFormPayload, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSave = async () => {
    setError(null)
    setSuccess(null)

    try {
      await updateInvestigation.mutateAsync({
        summary: form.summary,
        findings: form.findings,
        observations: form.observations,
        evidence_review_notes: form.evidence_review_notes,
        actions_taken: form.actions_taken,
        recommendation: form.recommendation || undefined,
        remarks: form.remarks,
        status: form.status,
      })
      setSuccess('Investigation update saved successfully.')
    } catch (saveError) {
      setError((saveError as Error)?.message ?? 'Unable to save the investigation update.')
    }
  }

  const handleComplete = async () => {
    setError(null)
    setSuccess(null)

    const requiredFields = [
      ['summary', form.summary],
      ['findings', form.findings],
      ['actions_taken', form.actions_taken],
      ['recommendation', form.recommendation],
    ] as const

    const missing = requiredFields.filter(([, value]) => !String(value).trim()).map(([label]) => label)
    if (missing.length > 0) {
      setError(`A completed investigation requires: ${missing.join(', ')}.`)
      return
    }

    try {
      await completeInvestigation.mutateAsync({
        summary: form.summary,
        findings: form.findings,
        observations: form.observations,
        evidence_review_notes: form.evidence_review_notes,
        actions_taken: form.actions_taken,
        recommendation: form.recommendation as InvestigationRecommendation,
        remarks: form.remarks,
        status: 'COMPLETED',
      })
      setSuccess('Investigation completed and the case timeline has been updated.')
    } catch (completeError) {
      setError((completeError as Error)?.message ?? 'Unable to complete the investigation.')
    }
  }

  if (complaintQuery.isLoading) {
    return (
      <AppShell title="Complaint Investigation">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500 shadow-card">
          Loading complaint investigation workspace...
        </div>
      </AppShell>
    )
  }

  if (complaintQuery.isError || !complaintQuery.data) {
    return (
      <AppShell title="Complaint Investigation">
        <ErrorState message="Could not load the complaint investigation workspace." onRetry={() => complaintQuery.refetch()} />
      </AppShell>
    )
  }

  return (
    <AppShell title={`Complaint Investigation #${complaintId}`}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              <Link to={`/reviewer/complaints/${complaintId}`} className="inline-flex items-center gap-1 text-primary-700 hover:underline">
                <ArrowLeft className="size-3.5" />
                Back to complaint
              </Link>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">Investigation Workspace</h1>
            <p className="mt-1 text-sm text-neutral-600">
              {complaintQuery.data.title} • Case #{complaintQuery.data.id}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-primary-50 px-3 py-2 text-sm font-medium text-primary-800">
            <Sparkles className="size-4" />
            AI review is advisory; reviewer evidence remains the source of truth.
          </div>
        </div>

        {notStarted && !hasInvestigation ? (
          <div className="rounded-2xl border border-dashed border-primary-200 bg-primary-50 p-6 shadow-card">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white p-2 text-primary-700">
                <ShieldAlert className="size-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-neutral-900">Investigation has not started</h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Open this workspace to document evidence review, findings, and the final recommendation without altering the customer-facing complaint workflow.
                </p>
                <div className="mt-4">
                  <Button
                    isLoading={startInvestigation.isPending}
                    onClick={() => startInvestigation.mutate()}
                    className="bg-primary-700 hover:bg-primary-800 text-white"
                  >
                    Start investigation
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {error && (
          <div className="rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">{error}</div>
        )}

        {success && (
          <div className="rounded-xl border border-success-200 bg-success-50 p-3 text-sm text-success-700">{success}</div>
        )}

        {hasInvestigation && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_0.85fr]">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
              <div className="mb-6 flex items-center justify-between border-b border-neutral-200 pb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Case investigation</p>
                  <h2 className="mt-1 text-xl font-bold text-neutral-900">Review and documentation</h2>
                </div>
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
                  {form.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="space-y-5">
                <Select
                  label="Investigation status"
                  value={form.status}
                  onChange={(event) => updateField('status', event.target.value as InvestigationStatus)}
                >
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="AWAITING_INFORMATION">Awaiting information</option>
                  <option value="COMPLETED">Completed</option>
                </Select>

                <Textarea
                  label="Summary"
                  value={form.summary}
                  onChange={(event) => updateField('summary', event.target.value)}
                  rows={4}
                  placeholder="Provide the concise investigation summary and case context."
                />

                <Textarea
                  label="Findings"
                  value={form.findings}
                  onChange={(event) => updateField('findings', event.target.value)}
                  rows={5}
                  placeholder="Document the evidence reviewed, issues identified, and analysis outcomes."
                />

                <Textarea
                  label="Observations"
                  value={form.observations}
                  onChange={(event) => updateField('observations', event.target.value)}
                  rows={4}
                  placeholder="Summarise field observations, photographs, records, or follow-up notes."
                />

                <Textarea
                  label="Evidence review notes"
                  value={form.evidence_review_notes}
                  onChange={(event) => updateField('evidence_review_notes', event.target.value)}
                  rows={4}
                  placeholder="Capture which evidence was reviewed and whether it supports the case conclusion."
                />

                <Textarea
                  label="Actions taken"
                  value={form.actions_taken}
                  onChange={(event) => updateField('actions_taken', event.target.value)}
                  rows={4}
                  placeholder="Outline the steps taken, calls made, inspection notes, and review actions."
                />

                <Select
                  label="Recommendation"
                  value={form.recommendation}
                  onChange={(event) => updateField('recommendation', event.target.value as InvestigationRecommendation)}
                >
                  <option value="">Select recommendation</option>
                  <option value="RESOLVE_COMPLAINT">Resolve complaint</option>
                  <option value="REJECT_COMPLAINT">Reject complaint</option>
                  <option value="ESCALATE_COMPLAINT">Escalate complaint</option>
                  <option value="REQUEST_MORE_INFORMATION">Request more information</option>
                </Select>

                <Textarea
                  label="Reviewer remarks"
                  value={form.remarks}
                  onChange={(event) => updateField('remarks', event.target.value)}
                  rows={3}
                  placeholder="Add remarks for the final decision trail or handoff notes."
                />

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    onClick={handleSave}
                    isLoading={updateInvestigation.isPending}
                    className="bg-primary-700 hover:bg-primary-800 text-white"
                  >
                    Save investigation update
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleComplete}
                    isLoading={completeInvestigation.isPending}
                    className="border-success-200 text-success-700 hover:bg-success-50"
                  >
                    <CheckCircle2 className="mr-2 size-4" />
                    Complete investigation
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
                <div className="mb-4 flex items-center gap-2">
                  <FileText className="size-4 text-primary-700" />
                  <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-neutral-700">Investigation summary</h3>
                </div>

                <div className="space-y-3 text-sm text-neutral-600">
                  <div className="rounded-xl bg-neutral-50 p-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Status</div>
                    <div className="mt-1 font-semibold text-neutral-900">{form.status.replace(/_/g, ' ')}</div>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Recommendation</div>
                    <div className="mt-1 font-semibold text-neutral-900">
                      {form.recommendation ? getRecommendationLabel(form.recommendation) : 'Not set yet'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Started</div>
                    <div className="mt-1 font-semibold text-neutral-900">
                      {formatDateTime((inquiry as ComplaintInvestigation)?.started_at ?? null)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Last updated</div>
                    <div className="mt-1 font-semibold text-neutral-900">
                      {formatDateTime((inquiry as ComplaintInvestigation)?.updated_at ?? null)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
                <div className="mb-4 flex items-center gap-2">
                  <ShieldAlert className="size-4 text-primary-700" />
                  <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-neutral-700">AI review reminder</h3>
                </div>
                <p className="text-sm leading-6 text-neutral-600">
                  Automated analysis can help surface patterns and possible risk cues, but it does not replace the reviewer’s evidence assessment. Document the final decision based on verified records, complaint details, and the evidence reviewed.
                </p>
              </div>
            </div>
          </div>
        )}

        {historyEntries.length > 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center gap-2 text-primary-700">
              <AlertTriangle className="size-4" />
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-neutral-700">Investigation timeline</h3>
            </div>

            <div className="space-y-3">
              {historyEntries.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-semibold text-neutral-900">{entry.action_type.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-neutral-500">{formatDateTime(entry.created_at)}</div>
                  </div>
                  <p className="mt-2 text-sm text-neutral-700">{entry.summary}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {entry.actor ? `${entry.actor.first_name} ${entry.actor.last_name}` : 'System'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
