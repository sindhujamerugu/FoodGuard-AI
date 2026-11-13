import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications'
import { queryKeys } from '@/lib/queryKeys'
import { useAuth } from '@/context/AuthContext'
import type { NotificationFilterParams } from '@/types/notification'

/** Fetch the authenticated user's notifications. Polls every 60 s while the
 *  tab is focused; stops polling when the tab is in the background. */
export function useNotifications(params?: NotificationFilterParams) {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: params ? [...queryKeys.notifications.all, params] : queryKeys.notifications.all,
    queryFn: () => notificationsApi.list(params),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  })
}

/** Retrieve total unread notifications count with fallback to in-memory list calculation. */
export function useUnreadNotificationsCount() {
  const { isAuthenticated } = useAuth()
  const { data: notifications } = useNotifications()
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      try {
        return await notificationsApi.unreadCount()
      } catch {
        return notifications ? notifications.filter((n) => !n.is_read).length : 0
      }
    },
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  })
}

/** Mark a single notification as read and invalidate notification queries. */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

/** Mark every unread notification as read. */
export function useMarkAllRead() {
  const queryClient = useQueryClient()
  const { data: notifications = [] } = useNotifications()
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(notifications),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

