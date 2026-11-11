import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { officerAssignmentsApi } from '@/api/officerAssignments'
import { useAuth } from '@/context/AuthContext'

/** Active officer assignment for a complaint. 404 = not yet assigned. */
export function useOfficerAssignment(complaintId: number) {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: ['officer-assignment', complaintId],
    queryFn:  () => officerAssignmentsApi.getForComplaint(complaintId),
    enabled:  isAuthenticated && Number.isFinite(complaintId) && complaintId > 0,
    retry:    (failureCount, error) => {
      // 404 = no assignment yet — not a transient failure
      if (axios.isAxiosError(error) && error.response?.status === 404) return false
      return failureCount < 1
    },
    staleTime: 60_000,
  })
}

/** Public escalation event history for a complaint. */
export function useEscalationEvents(complaintId: number) {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: ['escalation-events', complaintId],
    queryFn:  () => officerAssignmentsApi.getEvents(complaintId),
    enabled:  isAuthenticated && Number.isFinite(complaintId) && complaintId > 0,
    staleTime: 60_000,
  })
}
