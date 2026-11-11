import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications'
import { queryKeys } from '@/lib/queryKeys'
import { useAuth } from '@/context/AuthContext'

/** Fetch the authenticated user's notifications. Polls every 60 s while the
 *  tab is focused; stops polling when the tab is in the background. */
export function useNotifications() {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: notificationsApi.list,
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  })
}

/** Mark a single notification as read and optimistically update the cache. */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

/** Mark every unread notification as read in one batch call. */
export function useMarkAllRead() {
  const queryClient = useQueryClient()
  const { data: notifications = [] } = useNotifications()
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(notifications),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}
