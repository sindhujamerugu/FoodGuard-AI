import { Link } from 'react-router-dom'
import { FileText, MessageSquare, Plus, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { StatCard } from '@/components/dashboard/StatCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { ReportCard } from '@/components/reports/ReportCard'
import { ComplaintCard } from '@/components/complaints/ComplaintCard'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { ListSkeleton } from '@/components/states/LoadingSkeleton'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { useReports } from '@/hooks/useReports'
import { useComplaints } from '@/hooks/useComplaints'

export default function Dashboard() {
  const { user } = useAuth()
  const reportsQuery = useReports()
  const complaintsQuery = useComplaints()

  const reports = reportsQuery.data ?? []
  const complaints = complaintsQuery.data ?? []

  const openReports = reports.filter((r) => r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW').length
  const resolvedReports = reports.filter((r) => r.status === 'RESOLVED' || r.status === 'CLOSED').length
  const openComplaints = complaints.filter((c) => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW').length

  return (
    <AppShell title="Dashboard">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Welcome back, {user?.first_name}</h2>
          <p className="mt-1 text-sm text-neutral-500">Here's what's happening with your reports and complaints.</p>
        </div>
        <Link to="/reports/new">
          <Button>
            <Plus className="size-4" aria-hidden="true" />
            New Report
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total reports" value={reports.length} icon={FileText} tone="primary" />
        <StatCard label="Awaiting review" value={openReports} icon={ShieldAlert} tone="warning" />
        <StatCard label="Resolved reports" value={resolvedReports} icon={CheckCircle2} tone="success" />
        <StatCard label="Open complaints" value={openComplaints} icon={MessageSquare} tone="danger" />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <SectionHeader
            title="Recent reports"
            action={
              <Link to="/reports" className="text-sm font-medium text-primary-700 hover:underline">
                View all
              </Link>
            }
          />
          {reportsQuery.isLoading && <ListSkeleton items={3} />}
          {reportsQuery.isError && <ErrorState onRetry={() => reportsQuery.refetch()} />}
          {reportsQuery.isSuccess && reports.length === 0 && (
            <EmptyState
              icon={<FileText className="size-6" aria-hidden="true" />}
              title="No food safety reports yet"
              description="If you've experienced a food safety concern, you can report it here."
              action={
                <Link to="/reports/new">
                  <Button size="sm">Create Report</Button>
                </Link>
              }
            />
          )}
          {reportsQuery.isSuccess && reports.length > 0 && (
            <div className="space-y-3">
              {reports.slice(0, 4).map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionHeader
            title="Recent complaints"
            action={
              <Link to="/complaints" className="text-sm font-medium text-primary-700 hover:underline">
                View all
              </Link>
            }
          />
          {complaintsQuery.isLoading && <ListSkeleton items={3} />}
          {complaintsQuery.isError && <ErrorState onRetry={() => complaintsQuery.refetch()} />}
          {complaintsQuery.isSuccess && complaints.length === 0 && (
            <EmptyState
              icon={<MessageSquare className="size-6" aria-hidden="true" />}
              title="No complaints filed yet"
              description="Complaints can be filed once a report has been submitted for review."
            />
          )}
          {complaintsQuery.isSuccess && complaints.length > 0 && (
            <div className="space-y-3">
              {complaints.slice(0, 4).map((complaint) => (
                <ComplaintCard key={complaint.id} complaint={complaint} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
