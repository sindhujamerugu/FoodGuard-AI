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
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StatusBadge } from '@/components/badges/StatusBadge'
import { PriorityBadge } from '@/components/badges/PriorityBadge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/LoadingSkeleton'
import { CaseHeader } from '@/components/reviewer/CaseHeader'
import { CaseTimeline } from '@/components/reviewer/CaseTimeline'
import { AIReviewAssessment } from '@/components/reviewer/AIReviewAssessment'
import { ConfirmationModal } from '@/components/reviewer/ConfirmationModal'
import { EscalateCaseModal } from '@/components/reviewer/EscalateCaseModal'
import { ImageViewerModal } from '@/components/reviewer/ImageViewerModal'
import { useReport } from '@/hooks/useReports'
import { useAIAnalysis, useRunAIAnalysis } from '@/hooks/useAIAnalysis'
import { useComplaints, useUpdateComplaint } from '@/hooks/useComplaints'
import { useEscalations } from '@/hooks/useEscalations'
import { COMPLAINT_CATEGORY_LABELS } from '@/types/complaint'
import type { ComplaintPriority, ComplaintStatus } from '@/types/complaint'
import { toApiError } from '@/types/errors'

export default function ReviewerReportDetail() {
  const { id } = useParams<{ id: string }>()
  const reportId = Number(id)

  const { data: report, isLoading: isReportLoading, isError: isReportError, refetch: refetchReport } = useReport(reportId)
  const analysisQuery = useAIAnalysis(reportId)
  const runAnalysis = useRunAIAnalysis(reportId)
  const complaintsQuery = useComplaints()
  const escalationsQuery = useEscalations()

  // Find linked complaint if one exists for this food report
  const linkedComplaint = useMemo(() => {
    return (complaintsQuery.data ?? []).find((c) => c.food_report.id === reportId)
  }, [complaintsQuery.data, reportId])

  // Find any active or historical escalation for the linked complaint
  const linkedEscalation = useMemo(() => {
    if (!linkedComplaint) return null
    return (escalationsQuery.data ?? []).find((e) => e.complaint.id === linkedComplaint.id)
  }, [escalationsQuery.data, linkedComplaint])

  const updateComplaint = useUpdateComplaint(linkedComplaint?.id ?? 0)

  // Reviewer workflow action state (when complaint exists)
  const [targetPriority, setTargetPriority] = useState<ComplaintPriority | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [notesInitialized, setNotesInitialized] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Modals state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string
    message: string
    tone: 'danger' | 'primary' | 'warning'
    onConfirm: () => Promise<void>
  } | null>(null)
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  // Initialize form when linked complaint loads
  if (linkedComplaint && !notesInitialized) {
    setTargetPriority(linkedComplaint.priority)
    setResolutionNotes(linkedComplaint.resolution_notes || '')
    setNotesInitialized(true)
  }

  const analysisNotFound =
    axios.isAxiosError(analysisQuery.error) && analysisQuery.error.response?.status === 404

  if (isReportLoading) {
    return (
      <AppShell title="Report Case Review">
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

  if (isReportError || !report) {
    return (
      <AppShell title="Report Case Review">
        <ErrorState
          message="Could not load food safety report details."
          onRetry={() => refetchReport()}
        />
      </AppShell>
    )
  }

  // Handle complaint status updates with confirmation
  async function executeStatusChange(newStatus: ComplaintStatus, notes: string) {
    if (!linkedComplaint) return
    setActionError(null)
    setActionSuccess(null)
    try {
      await updateComplaint.mutateAsync({
        status: newStatus,
        priority: targetPriority ?? linkedComplaint.priority,
        resolution_notes: notes,
      })
      setActionSuccess(`Case successfully updated to ${newStatus.replace('_', ' ')}.`)
      setIsConfirmOpen(false)
    } catch (err) {
      setActionError(toApiError(err).message)
    }
  }

  function handleTriggerTransition(nextStatus: ComplaintStatus) {
    if (nextStatus === 'RESOLVED') {
      setConfirmConfig({
        title: 'Confirm Case Resolution',
        message:
          'Resolving this case will record your findings and mark the investigation as satisfied. The customer will be able to review your resolution notes.',
        tone: 'primary',
        onConfirm: () => executeStatusChange('RESOLVED', resolutionNotes),
      })
      setIsConfirmOpen(true)
    } else if (nextStatus === 'CLOSED') {
      setConfirmConfig({
        title: 'Confirm Case Closure',
        message:
          'Closing this case permanently completes the review cycle. Once closed, no further status modifications or notes can be added.',
        tone: 'danger',
        onConfirm: () => executeStatusChange('CLOSED', resolutionNotes),
      })
      setIsConfirmOpen(true)
    } else {
      void executeStatusChange(nextStatus, resolutionNotes)
    }
  }

  async function handleSaveNotesAndPriority() {
    if (!linkedComplaint) return
    setActionError(null)
    setActionSuccess(null)
    try {
      await updateComplaint.mutateAsync({
        priority: targetPriority ?? linkedComplaint.priority,
        resolution_notes: resolutionNotes,
      })
      setActionSuccess('Reviewer notes and priority updated.')
    } catch (err) {
      setActionError(toApiError(err).message)
    }
  }

  return (
    <AppShell title={`Case #REP-${report.id} Review`}>
      {/* Case Header */}
      <CaseHeader
        reference={`REP-${report.id}`}
        title={report.title}
        backTo="/reviewer/reports"
        backLabel="Back to reports queue"
        status={report.status}
        priority={report.priority}
        restaurantName={report.restaurant.name}
        restaurantCity={report.restaurant.city}
        submittedAt={report.created_at}
        actionSlot={
          linkedComplaint ? (
            <Link to={`/reviewer/complaints/${linkedComplaint.id}`}>
              <Button size="sm" variant="outline" className="text-xs">
                <MessageSquare className="size-3.5" />
                Linked Complaint #{linkedComplaint.id}
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* Two-Column Case Workspace */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* ======================================================== */}
        {/* LEFT COLUMN (7 cols): Case Details & Linked Complaint   */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Case Details Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary-700" />
                <h2 className="text-sm font-bold tracking-tight text-neutral-900 uppercase tracking-wider">
                  Case Details
                </h2>
              </div>
              <span className="text-xs text-neutral-400 font-mono">
                Report #{report.id}
              </span>
            </div>

            {/* Description Narrative */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Incident Description
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800 bg-neutral-25 p-4 rounded-xl border border-neutral-100 font-normal">
                {report.description || 'No descriptive text provided.'}
              </p>
            </div>

            {/* Food Image Evidence Display */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Photographic Evidence
                </h3>
                {report.image && (
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
                {report.image ? (
                  <img
                    src={report.image}
                    alt={`Evidence for ${report.title}`}
                    className="size-full object-cover transition-transform duration-300 hover:scale-102 cursor-pointer"
                    onClick={() => setIsImageModalOpen(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-neutral-400 p-6 text-center">
                    <ImageOff className="size-8" />
                    <p className="mt-2 text-xs font-medium">No photographic evidence attached</p>
                    <p className="text-[11px] text-neutral-400">Customer submitted without an image.</p>
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
                  {report.restaurant.name}
                </p>
                <p className="mt-0.5 text-xs text-neutral-600 flex items-center gap-1">
                  <MapPin className="size-3 text-neutral-400" />
                  {report.restaurant.city}, {report.restaurant.state}
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
                  {report.customer.first_name} {report.customer.last_name}
                </p>
                <p className="mt-0.5 text-xs text-neutral-600 flex items-center gap-1 truncate">
                  <Mail className="size-3 text-neutral-400" />
                  {report.customer.email}
                </p>
                <p className="mt-2 text-[11px] text-neutral-400">
                  Language: {report.customer.preferred_language?.toUpperCase() || 'EN'}
                </p>
              </div>
            </div>
          </div>

          {/* Linked Formal Complaint Section */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-primary-700" />
                <h3 className="text-sm font-bold tracking-tight text-neutral-900 uppercase tracking-wider">
                  Linked Customer Complaint
                </h3>
              </div>
              {linkedComplaint && (
                <span className="font-mono text-xs font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">
                  CMP #{linkedComplaint.id}
                </span>
              )}
            </div>

            {linkedComplaint ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-900">
                      {linkedComplaint.title}
                    </h4>
                    <span className="text-xs text-neutral-500">
                      Category: {COMPLAINT_CATEGORY_LABELS[linkedComplaint.category] ?? linkedComplaint.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={linkedComplaint.priority} />
                    <StatusBadge status={linkedComplaint.status} />
                  </div>
                </div>

                <div className="rounded-xl bg-neutral-50 p-3.5 text-xs leading-relaxed text-neutral-700 border border-neutral-100">
                  <p className="font-medium text-neutral-800 mb-1">Customer Statement:</p>
                  <p className="whitespace-pre-wrap">{linkedComplaint.description}</p>
                </div>

                {linkedComplaint.resolution_notes && (
                  <div className="rounded-xl bg-success-50 p-3.5 text-xs leading-relaxed text-success-800 border border-success-200">
                    <p className="font-semibold text-success-900 mb-1">Resolution Notes on Record:</p>
                    <p className="whitespace-pre-wrap">{linkedComplaint.resolution_notes}</p>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <Link to={`/reviewer/complaints/${linkedComplaint.id}`}>
                    <Button variant="outline" size="sm" className="text-xs">
                      Manage Full Complaint Lifecycle
                      <ExternalLink className="size-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-25 p-5 text-center">
                <p className="text-xs text-neutral-500">
                  No formal customer complaint has been filed against this report yet.
                </p>
                <p className="mt-1 text-[11px] text-neutral-400">
                  Customers may elevate this report into a complaint if they experienced foodborne symptoms or unaddressed grievances.
                </p>
              </div>
            )}
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
            hasImage={Boolean(report.image)}
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
              <span className="text-xs text-neutral-500 font-medium">
                Current: <strong className="text-neutral-800">{linkedComplaint?.status ?? report.status}</strong>
              </span>
            </div>

            {linkedComplaint ? (
              <div className="space-y-4">
                {/* Workflow Transitions */}
                <div>
                  <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider block mb-2">
                    Allowed Lifecycle Transitions
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {linkedComplaint.status === 'SUBMITTED' && (
                      <Button
                        size="sm"
                        isLoading={updateComplaint.isPending}
                        onClick={() => handleTriggerTransition('UNDER_REVIEW')}
                        className="bg-warning-600 hover:bg-warning-700 text-white text-xs"
                      >
                        <Clock className="size-3.5 mr-1" />
                        Move to Under Review
                      </Button>
                    )}

                    {linkedComplaint.status === 'UNDER_REVIEW' && (
                      <>
                        <Button
                          size="sm"
                          isLoading={updateComplaint.isPending}
                          onClick={() => handleTriggerTransition('RESOLVED')}
                          className="bg-success-700 hover:bg-success-800 text-white text-xs"
                        >
                          <CheckCircle2 className="size-3.5 mr-1" />
                          Resolve Case
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={updateComplaint.isPending}
                          onClick={() => handleTriggerTransition('SUBMITTED')}
                          className="text-xs"
                        >
                          Return to Submitted
                        </Button>
                      </>
                    )}

                    {linkedComplaint.status === 'RESOLVED' && (
                      <Button
                        size="sm"
                        isLoading={updateComplaint.isPending}
                        onClick={() => handleTriggerTransition('CLOSED')}
                        className="bg-neutral-800 hover:bg-neutral-900 text-white text-xs"
                      >
                        Close Case
                      </Button>
                    )}

                    {linkedComplaint.status === 'CLOSED' && (
                      <p className="text-xs text-neutral-500 italic">
                        This complaint is closed. Audit log is locked.
                      </p>
                    )}

                    {/* Escalate button */}
                    {linkedComplaint.status !== 'CLOSED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEscalateModalOpen(true)}
                        className="text-xs border-danger-200 text-danger-700 hover:bg-danger-50"
                      >
                        <ShieldAlert className="size-3.5 mr-1" />
                        Escalate
                      </Button>
                    )}
                  </div>
                </div>

                {/* Priority Selection */}
                {linkedComplaint.status !== 'CLOSED' && (
                  <div className="space-y-1.5">
                    <Select
                      label="Case Priority Tier"
                      value={targetPriority ?? linkedComplaint.priority}
                      onChange={(e) => setTargetPriority(e.target.value as ComplaintPriority)}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </Select>
                  </div>
                )}

                {/* Resolution / Reviewer Notes */}
                {linkedComplaint.status !== 'CLOSED' && (
                  <div className="space-y-1.5">
                    <Textarea
                      label="Investigation & Resolution Notes"
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      rows={3}
                      placeholder="Enter findings, corrective directives given to restaurant, or closure rationale..."
                      hint="Visible to complainant and restaurant owners upon resolution."
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs"
                      isLoading={updateComplaint.isPending}
                      onClick={handleSaveNotesAndPriority}
                    >
                      Save Notes & Priority
                    </Button>
                  </div>
                )}

                {actionError && (
                  <p role="alert" className="text-xs text-danger-600 bg-danger-50 p-2.5 rounded-lg border border-danger-200">
                    {actionError}
                  </p>
                )}

                {actionSuccess && (
                  <p role="status" className="text-xs text-success-700 bg-success-50 p-2.5 rounded-lg border border-success-200">
                    {actionSuccess}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-xs text-neutral-600">
                <p>
                  This report is currently in <strong className="text-neutral-900">{report.status}</strong> status.
                </p>
                <p className="text-neutral-500 leading-relaxed">
                  Food safety reports submitted by customers are archived evidence. Reviewer investigation workflows and resolution transitions apply once a formal complaint is linked.
                </p>
                <div className="rounded-xl bg-neutral-50 p-3 border border-neutral-100 flex items-center justify-between">
                  <span className="font-medium text-neutral-700">All Visual Data Verified</span>
                  <StatusBadge status={report.status} />
                </div>
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
              submittedAt={report.created_at}
              underReviewAt={
                linkedComplaint?.status === 'UNDER_REVIEW' ||
                linkedComplaint?.status === 'RESOLVED' ||
                linkedComplaint?.status === 'CLOSED'
                  ? linkedComplaint.updated_at
                  : null
              }
              escalatedAt={linkedEscalation?.created_at ?? null}
              escalationLevel={linkedEscalation?.escalation_level ?? null}
              resolvedAt={linkedComplaint?.resolved_at ?? null}
              closedAt={linkedComplaint?.status === 'CLOSED' ? linkedComplaint.resolved_at : null}
              status={linkedComplaint?.status ?? report.status}
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
      {linkedComplaint && (
        <EscalateCaseModal
          isOpen={isEscalateModalOpen}
          complaintId={linkedComplaint.id}
          caseTitle={report.title}
          onClose={() => setIsEscalateModalOpen(false)}
          onSuccess={() => {
            setActionSuccess('Case escalated to senior review tier.')
            void complaintsQuery.refetch()
            void escalationsQuery.refetch()
          }}
        />
      )}

      {/* Image Lightbox Viewer Modal */}
      {report.image && (
        <ImageViewerModal
          isOpen={isImageModalOpen}
          src={report.image}
          title={report.title}
          onClose={() => setIsImageModalOpen(false)}
        />
      )}
    </AppShell>
  )
}
