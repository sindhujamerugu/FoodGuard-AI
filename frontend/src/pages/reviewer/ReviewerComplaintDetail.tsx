import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import {
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  ImageOff,
  Mail,
  MapPin,
  MessageSquare,
  ShieldAlert,
  UserCheck,
  XCircle,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/LoadingSkeleton'
import { CaseHeader } from '@/components/reviewer/CaseHeader'
import { CaseTimeline } from '@/components/reviewer/CaseTimeline'
import { AIReviewAssessment } from '@/components/reviewer/AIReviewAssessment'
import { ComplaintLocationMapCard } from '@/components/reviewer/ComplaintLocationMapCard'
import { ConfirmationModal } from '@/components/reviewer/ConfirmationModal'
import { EscalateCaseModal } from '@/components/reviewer/EscalateCaseModal'
import { ImageViewerModal } from '@/components/reviewer/ImageViewerModal'
import { RejectComplaintModal } from '@/components/reviewer/RejectComplaintModal'
import { useComplaint, useUpdateComplaint } from '@/hooks/useComplaints'
import { useReport } from '@/hooks/useReports'
import { useAIAnalysis, useRunAIAnalysis } from '@/hooks/useAIAnalysis'
import { useEscalations } from '@/hooks/useEscalations'
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_STATUS_TRANSITIONS } from '@/types/complaint'
import type { ComplaintPriority, ComplaintStatus } from '@/types/complaint'
import { toApiError } from '@/types/errors'

export default function ReviewerComplaintDetail() {
  const { id } = useParams<{ id: string }>()
  const complaintId = Number(id)

  const { data: complaint, isLoading, isError, refetch } = useComplaint(complaintId)
  const updateComplaint = useUpdateComplaint(complaintId)

  // Fetch linked food report to access photographic evidence
  const { data: linkedReport } = useReport(complaint?.food_report.id ?? 0)

  // Fetch AI analysis for linked food report
  const analysisQuery = useAIAnalysis(complaint?.food_report.id ?? 0)
  const runAnalysis = useRunAIAnalysis(complaint?.food_report.id ?? 0)

  // Fetch escalations to check if this complaint has real escalation history
  const escalationsQuery = useEscalations()
  const linkedEscalation = useMemo(() => {
    return (escalationsQuery.data ?? []).find((e) => e.complaint.id === complaintId)
  }, [escalationsQuery.data, complaintId])

  const [status, setStatus] = useState<ComplaintStatus>('SUBMITTED')
  const [priority, setPriority] = useState<ComplaintPriority>('LOW')
  const [notes, setNotes] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  // Modal dialog states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string
    message: string
    tone: 'danger' | 'primary' | 'warning'
    onConfirm: () => Promise<void>
  } | null>(null)
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)

  const [prevComplaintId, setPrevComplaintId] = useState<number | null>(null)
  if (complaint && complaint.id !== prevComplaintId) {
    setPrevComplaintId(complaint.id)
    setStatus(complaint.status)
    setPriority(complaint.priority)
    setNotes(complaint.resolution_notes || '')
  }

  const analysisNotFound =
    axios.isAxiosError(analysisQuery.error) && analysisQuery.error.response?.status === 404

  if (isLoading) {
    return (
      <AppShell title="Complaint Case Review">
        <div className="space-y-6">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Skeleton className="h-96 rounded-2xl lg:col-span-8" />
            <Skeleton className="h-96 rounded-2xl lg:col-span-4" />
          </div>
        </div>
      </AppShell>
    )
  }

  if (isError || !complaint) {
    return (
      <AppShell title="Complaint Case Review">
        <ErrorState message="Could not load food safety complaint details." onRetry={() => refetch()} />
      </AppShell>
    )
  }

  const isTerminal = complaint.status === 'CLOSED' || complaint.status === 'REJECTED'
  const allowedNextStatuses = COMPLAINT_STATUS_TRANSITIONS[complaint.status]

  async function handleConfirmRejection(rejectionReason: string, additionalRemarks?: string) {
    setSaveError(null)
    setSaveSuccess(null)
    try {
      await updateComplaint.mutateAsync({
        status: 'REJECTED',
        rejection_reason: rejectionReason,
        resolution_notes: additionalRemarks ?? notes,
      })
      setStatus('REJECTED')
      setSaveSuccess('Complaint has been formally rejected. The customer has been notified.')
      setIsRejectModalOpen(false)
    } catch (error) {
      setSaveError(toApiError(error).message)
      throw error
    }
  }

  async function executeStatusChange(nextStatus: ComplaintStatus) {
    setSaveError(null)
    setSaveSuccess(null)
    try {
      await updateComplaint.mutateAsync({
        status: nextStatus,
        priority,
        resolution_notes: notes,
      })
      setStatus(nextStatus)
      setSaveSuccess(`Complaint moved to ${nextStatus.replace('_', ' ')}.`)
      setIsConfirmOpen(false)
    } catch (error) {
      setSaveError(toApiError(error).message)
    }
  }

  function handleTransitionClick(nextStatus: ComplaintStatus) {
    if (nextStatus === 'RESOLVED') {
      setConfirmConfig({
        title: 'Confirm Complaint Resolution',
        message:
          'Resolving this complaint concludes the active investigation. Resolution notes will be published on the customer portal.',
        tone: 'primary',
        onConfirm: () => executeStatusChange('RESOLVED'),
      })
      setIsConfirmOpen(true)
    } else if (nextStatus === 'CLOSED') {
      setConfirmConfig({
        title: 'Confirm Permanent Case Closure',
        message:
          'Closing this case permanently seals the complaint record. No further workflow transitions or edits are permitted after closure.',
        tone: 'danger',
        onConfirm: () => executeStatusChange('CLOSED'),
      })
      setIsConfirmOpen(true)
    } else {
      void executeStatusChange(nextStatus)
    }
  }

  async function handleSaveDetailsOnly() {
    setSaveError(null)
    setSaveSuccess(null)
    try {
      await updateComplaint.mutateAsync({
        priority,
        resolution_notes: notes,
      })
      setSaveSuccess('Priority and resolution notes updated successfully.')
    } catch (error) {
      setSaveError(toApiError(error).message)
    }
  }

  return (
    <AppShell title={`Case #CMP-${complaint.id} Review`}>
      {/* Case Header */}
      <CaseHeader
        reference={`CMP-${complaint.id}`}
        title={complaint.title}
        backTo="/reviewer/complaints"
        backLabel="Back to complaints queue"
        status={complaint.status}
        priority={complaint.priority}
        restaurantName={complaint.restaurant.name}
        restaurantCity={complaint.restaurant.city}
        submittedAt={complaint.submitted_at}
        actionSlot={
          <Link to={`/reviewer/reports/${complaint.food_report.id}`}>
            <Button size="sm" variant="outline" className="text-xs">
              <FileText className="size-3.5" />
              Linked Report #{complaint.food_report.id}
            </Button>
          </Link>
        }
      />

      {/* Two-Column Case Workspace */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* ======================================================== */}
        {/* LEFT COLUMN (7 cols): Case Details & Evidence Photo      */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Case Details Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-primary-700" />
                <h2 className="text-sm font-bold tracking-tight text-neutral-900 uppercase tracking-wider">
                  Case Details
                </h2>
              </div>
              <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700">
                Category: {COMPLAINT_CATEGORY_LABELS[complaint.category]}
              </span>
            </div>

            {/* Customer Grievance Narrative */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Customer Incident Statement
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800 bg-neutral-25 p-4 rounded-xl border border-neutral-100 font-normal">
                {complaint.description}
              </p>
            </div>

            {/* Evidence Image from Linked Report */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Linked Food Evidence Photo
                  </h3>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    (Report #{complaint.food_report.id})
                  </span>
                </div>
                {linkedReport?.image && (
                  <button
                    type="button"
                    onClick={() => setIsImageModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
                  >
                    <Eye className="size-3.5" /> Full Size
                  </button>
                )}
              </div>

              <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 aspect-video flex items-center justify-center">
                {linkedReport?.image ? (
                  <img
                    src={linkedReport.image}
                    alt={`Evidence for report #${complaint.food_report.id}`}
                    className="size-full object-cover transition-transform duration-300 hover:scale-102 cursor-pointer"
                    onClick={() => setIsImageModalOpen(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-neutral-400 p-6 text-center">
                    <ImageOff className="size-8" />
                    <p className="mt-2 text-xs font-medium">No photographic evidence attached</p>
                    <p className="text-[11px] text-neutral-400">Customer filed report without an image.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Entity Metadata: Restaurant & Customer */}
            <div className="grid grid-cols-1 gap-4 pt-2 border-t border-neutral-100 sm:grid-cols-2">
              {/* Restaurant Details */}
              <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  <Building2 className="size-3.5 text-neutral-400" />
                  Establishment
                </div>
                <p className="mt-1 text-sm font-semibold text-neutral-900">
                  {complaint.restaurant.name}
                </p>
                <p className="mt-0.5 text-xs text-neutral-600 flex items-center gap-1">
                  <MapPin className="size-3 text-neutral-400" />
                  {complaint.restaurant.city}, {complaint.restaurant.state}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Link
                    to="/reviewer/restaurants"
                    className="text-[11px] font-medium text-primary-700 hover:underline inline-flex items-center gap-0.5"
                  >
                    View Restaurant Profile <ExternalLink className="size-2.5" />
                  </Link>
                </div>
              </div>

              {/* Customer Details */}
              <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  <UserCheck className="size-3.5 text-neutral-400" />
                  Submitting Customer
                </div>
                <p className="mt-1 text-sm font-semibold text-neutral-900">
                  {complaint.customer.first_name} {complaint.customer.last_name}
                </p>
                <p className="mt-0.5 text-xs text-neutral-600 flex items-center gap-1 truncate">
                  <Mail className="size-3 text-neutral-400" />
                  {complaint.customer.email}
                </p>
                <p className="mt-2 text-[11px] text-neutral-400">
                  Language: {complaint.original_language?.toUpperCase() || 'EN'}
                </p>
              </div>
            </div>
          </div>

          <ComplaintLocationMapCard
            latitude={linkedReport?.location_lat ?? null}
            longitude={linkedReport?.location_lng ?? null}
            locationName={complaint.restaurant.name}
            className="mt-0"
          />

          {/* Linked Report Quick Summary */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                <FileText className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Associated Primary Food Report
                </p>
                <h4 className="text-sm font-semibold text-neutral-900">
                  #{complaint.food_report.id}: {complaint.food_report.title}
                </h4>
              </div>
            </div>
            <Link to={`/reviewer/reports/${complaint.food_report.id}`}>
              <Button size="sm" variant="outline" className="text-xs">
                Open Report Case
                <ExternalLink className="size-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN (5 cols): AI Assessment, Action Area & Timeline */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. AI Visual Assessment Card */}
          <AIReviewAssessment
            analysis={analysisQuery.data}
            isLoading={analysisQuery.isLoading}
            isNotFound={analysisNotFound}
            hasImage={Boolean(linkedReport?.image)}
            isRunning={runAnalysis.isPending}
            onRunAnalysis={() => runAnalysis.mutate()}
          />

          {/* 2. Reviewer Action Area */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-primary-700" />
                <h3 className="text-sm font-bold tracking-tight text-neutral-900 uppercase tracking-wider">
                  Reviewer Action
                </h3>
              </div>
              <StatusBadge status={status} />
            </div>

            <Link to={`/reviewer/complaints/${complaint.id}/investigation`}>
              <Button size="sm" variant="outline" className="mb-4 w-full justify-center text-xs">
                Open investigation workspace
              </Button>
            </Link>

            {isTerminal ? (
              complaint.status === 'REJECTED' ? (
                <div className="rounded-xl bg-danger-50 p-4 text-xs text-danger-800 border border-danger-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-danger-900">
                    <XCircle className="size-4 text-danger-600" />
                    Case Formally Rejected
                  </div>
                  <p className="leading-relaxed">
                    <strong className="font-semibold text-danger-950">Rejection Reason:</strong>{' '}
                    {complaint.rejection_reason || 'No specific rationale entered.'}
                  </p>
                  {complaint.rejected_at && (
                    <p className="text-[11px] text-danger-600 font-mono">
                      Rejected on: {new Date(complaint.rejected_at).toLocaleString()}
                      {complaint.rejected_by && ` by ${complaint.rejected_by.first_name} ${complaint.rejected_by.last_name}`}
                    </p>
                  )}
                  <p className="text-[11px] text-danger-600">
                    This complaint case is sealed. No further reviewer transitions are permitted.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-neutral-50 p-4 text-xs text-neutral-500 text-center border border-neutral-200">
                  <p className="font-semibold text-neutral-800">Case Audit Locked</p>
                  <p className="mt-1">
                    This complaint has been permanently closed. Workflow state and investigation notes are archived.
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-4">
                {/* Workflow Transitions */}
                <div>
                  <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider block mb-2">
                    Allowed Lifecycle Transitions
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allowedNextStatuses.map((next) => {
                      if (next === 'UNDER_REVIEW') {
                        return (
                          <Button
                            key={next}
                            size="sm"
                            isLoading={updateComplaint.isPending}
                            onClick={() => handleTransitionClick('UNDER_REVIEW')}
                            className="bg-warning-600 hover:bg-warning-700 text-white text-xs"
                          >
                            <Clock className="size-3.5 mr-1" />
                            Move to Under Review
                          </Button>
                        )
                      }
                      if (next === 'RESOLVED') {
                        return (
                          <Button
                            key={next}
                            size="sm"
                            isLoading={updateComplaint.isPending}
                            onClick={() => handleTransitionClick('RESOLVED')}
                            className="bg-success-700 hover:bg-success-800 text-white text-xs"
                          >
                            <CheckCircle2 className="size-3.5 mr-1" />
                            Resolve Case
                          </Button>
                        )
                      }
                      if (next === 'CLOSED') {
                        return (
                          <Button
                            key={next}
                            size="sm"
                            isLoading={updateComplaint.isPending}
                            onClick={() => handleTransitionClick('CLOSED')}
                            className="bg-neutral-800 hover:bg-neutral-900 text-white text-xs"
                          >
                            Close Case
                          </Button>
                        )
                      }
                      if (next === 'REJECTED') {
                        return (
                          <Button
                            key={next}
                            size="sm"
                            variant="outline"
                            isLoading={updateComplaint.isPending}
                            onClick={() => setIsRejectModalOpen(true)}
                            className="text-xs border-danger-200 text-danger-700 hover:bg-danger-50"
                          >
                            <XCircle className="size-3.5 mr-1" />
                            Reject Complaint
                          </Button>
                        )
                      }
                      return (
                        <Button
                          key={next}
                          size="sm"
                          variant="outline"
                          isLoading={updateComplaint.isPending}
                          onClick={() => handleTransitionClick(next)}
                          className="text-xs"
                        >
                          {next.replace('_', ' ')}
                        </Button>
                      )
                    })}

                    {/* Escalate button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEscalateModalOpen(true)}
                      className="text-xs border-danger-200 text-danger-700 hover:bg-danger-50"
                    >
                      <ShieldAlert className="size-3.5 mr-1" />
                      Escalate
                    </Button>
                  </div>
                </div>

                {/* Priority Selection */}
                <div className="space-y-1.5">
                  <Select
                    label="Case Priority Tier"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </Select>
                </div>

                {/* Resolution / Reviewer Notes */}
                <div className="space-y-1.5">
                  <Textarea
                    label="Investigation & Resolution Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Enter factual findings, inspector observations, required corrective action, or resolution justification..."
                    hint="Customer and restaurant can view these notes once the complaint is resolved."
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    isLoading={updateComplaint.isPending}
                    onClick={handleSaveDetailsOnly}
                  >
                    Save Notes & Priority
                  </Button>
                </div>

                {saveError && (
                  <p role="alert" className="text-xs text-danger-600 bg-danger-50 p-2.5 rounded-lg border border-danger-200">
                    {saveError}
                  </p>
                )}

                {saveSuccess && (
                  <p role="status" className="text-xs text-success-700 bg-success-50 p-2.5 rounded-lg border border-success-200">
                    {saveSuccess}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 3. Audit / Case Timeline */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-primary-700" />
                <h3 className="text-sm font-bold tracking-tight text-neutral-900 uppercase tracking-wider">
                  Audit & Case Timeline
                </h3>
              </div>
              <span className="text-[11px] text-neutral-400 font-mono">Real-time log</span>
            </div>

            <CaseTimeline
              submittedAt={complaint.submitted_at}
              underReviewAt={
                complaint.status === 'UNDER_REVIEW' ||
                complaint.status === 'RESOLVED' ||
                complaint.status === 'CLOSED' ||
                complaint.status === 'REJECTED'
                  ? complaint.updated_at
                  : null
              }
              escalatedAt={linkedEscalation?.created_at ?? null}
              escalationLevel={linkedEscalation?.escalation_level ?? null}
              resolvedAt={complaint.resolved_at}
              closedAt={complaint.status === 'CLOSED' ? complaint.resolved_at : null}
              rejectedAt={complaint.rejected_at}
              rejectionReason={complaint.rejection_reason}
              status={complaint.status}
            />
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmConfig && (
        <ConfirmationModal
          isOpen={isConfirmOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          tone={confirmConfig.tone}
          isLoading={updateComplaint.isPending}
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setIsConfirmOpen(false)}
        />
      )}

      {/* Escalate Case Modal */}
      <EscalateCaseModal
        isOpen={isEscalateModalOpen}
        complaintId={complaint.id}
        caseTitle={complaint.title}
        onClose={() => setIsEscalateModalOpen(false)}
        onSuccess={() => {
          setSaveSuccess('Case escalated to higher review tier.')
          void refetch()
          void escalationsQuery.refetch()
        }}
      />

      {/* Evidence Image Lightbox Modal */}
      {linkedReport?.image && (
        <ImageViewerModal
          isOpen={isImageModalOpen}
          src={linkedReport.image}
          title={`Evidence for Report #${complaint.food_report.id}`}
          onClose={() => setIsImageModalOpen(false)}
        />
      )}

      {/* Reject Complaint Modal */}
      <RejectComplaintModal
        isOpen={isRejectModalOpen}
        complaintId={complaint.id}
        complaintTitle={complaint.title}
        isLoading={updateComplaint.isPending}
        apiError={saveError}
        onConfirm={handleConfirmRejection}
        onCancel={() => {
          setIsRejectModalOpen(false)
          setSaveError(null)
        }}
      />
    </AppShell>
  )
}
