import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { ComplaintOverview } from '@/components/complaints/ComplaintOverview'
import { ComplaintTimeline } from '@/components/complaints/ComplaintTimeline'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/states/ErrorState'
import { Skeleton } from '@/components/states/LoadingSkeleton'
import { Reveal } from '@/components/motion/Reveal'
import { useComplaint, useUpdateComplaint } from '@/hooks/useComplaints'
import { COMPLAINT_STATUS_TRANSITIONS } from '@/types/complaint'
import type { ComplaintPriority, ComplaintStatus } from '@/types/complaint'
import { toApiError } from '@/types/errors'

const PRIORITIES: ComplaintPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export default function ReviewerComplaintDetail() {
  const { id } = useParams<{ id: string }>()
  const complaintId = Number(id)
  const { data: complaint, isLoading, isError, refetch } = useComplaint(complaintId)
  const updateComplaint = useUpdateComplaint(complaintId)

  const [status, setStatus] = useState<ComplaintStatus>('SUBMITTED')
  const [priority, setPriority] = useState<ComplaintPriority>('LOW')
  const [notes, setNotes] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (complaint) {
      setStatus(complaint.status)
      setPriority(complaint.priority)
      setNotes(complaint.resolution_notes)
    }
  }, [complaint])

  if (isLoading) {
    return (
      <AppShell title="Complaint Review">
        <Skeleton className="mx-auto h-96 w-full max-w-3xl rounded-2xl" />
      </AppShell>
    )
  }

  if (isError || !complaint) {
    return (
      <AppShell title="Complaint Review">
        <ErrorState message="We couldn't load this complaint." onRetry={() => refetch()} />
      </AppShell>
    )
  }

  const allowedNextStatuses = COMPLAINT_STATUS_TRANSITIONS[complaint.status]
  const statusOptions = [complaint.status, ...allowedNextStatuses]
  const isTerminal = complaint.status === 'CLOSED'

  async function handleSave() {
    setSaveError(null)
    setSaved(false)
    try {
      await updateComplaint.mutateAsync({ status, priority, resolution_notes: notes })
      setSaved(true)
    } catch (error) {
      setSaveError(toApiError(error).message)
    }
  }

  return (
    <AppShell title="Complaint Review">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link to="/reviewer/complaints" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to complaints
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
          <div className="space-y-6">
            <ComplaintOverview complaint={complaint} showCustomer reportLinkBase="/reviewer/reports" />

            <Reveal delay={80} className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
              <h3 className="mb-4 text-sm font-semibold text-neutral-900">Update workflow</h3>
              {isTerminal ? (
                <p className="text-sm text-neutral-500">This complaint is closed. No further changes are allowed.</p>
              ) : (
                <div className="space-y-4">
                  <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as ComplaintStatus)}>
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s.replace('_', ' ')}
                      </option>
                    ))}
                  </Select>
                  <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as ComplaintPriority)}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                  <Textarea
                    label="Resolution notes"
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    hint="Visible to the customer once saved."
                  />
                  {saveError && (
                    <p role="alert" className="text-sm text-danger-600">
                      {saveError}
                    </p>
                  )}
                  {saved && <p className="text-sm text-success-600">Changes saved.</p>}
                  <Button isLoading={updateComplaint.isPending} onClick={handleSave}>
                    Save Changes
                  </Button>
                </div>
              )}
            </Reveal>
          </div>

          <Reveal delay={150} className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-card">
            <h3 className="mb-4 text-sm font-semibold text-neutral-900">Timeline</h3>
            <ComplaintTimeline complaint={complaint} />
          </Reveal>
        </div>
      </div>
    </AppShell>
  )
}
