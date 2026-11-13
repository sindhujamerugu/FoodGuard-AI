import { http } from '@/lib/http'
import type { Notification, NotificationFilterParams } from '@/types/notification'

export const notificationsApi = {
  /** GET /api/v1/notifications/ — own notifications, newest first. Supports query filtering. */
  list: (params?: NotificationFilterParams) =>
    http.get<Notification[]>('/notifications/', { params }).then((r) => r.data),

  /** GET /api/v1/notifications/unread-count/ — get total unread count. */
  unreadCount: () =>
    http.get<{ unread_count: number }>('/notifications/unread-count/').then((r) => r.data.unread_count),

  /** PATCH /api/v1/notifications/:id/ — mark a single notification read/unread. */
  markRead: (id: number, is_read = true) =>
    http.patch<Notification>(`/notifications/${id}/`, { is_read }).then((r) => r.data),

  /** Mark all unread notifications as read. Uses dedicated bulk endpoint with graceful fallback. */
  markAllRead: async (notifications?: Notification[]): Promise<void> => {
    try {
      await http.post('/notifications/mark-all-read/')
    } catch {
      // Fallback: if bulk endpoint unavailable or fails, patch each unread item
      if (notifications && notifications.length > 0) {
        const unread = notifications.filter((n) => !n.is_read)
        await Promise.allSettled(
          unread.map((n) =>
            http.patch(`/notifications/${n.id}/`, { is_read: true }).catch(() => undefined),
          ),
        )
      }
    }
  },
}

