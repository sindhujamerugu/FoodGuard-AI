import { http } from '@/lib/http'
import type { Notification } from '@/types/notification'

export const notificationsApi = {
  /** GET /api/v1/notifications/ — own notifications, newest first. */
  list: () => http.get<Notification[]>('/notifications/').then((r) => r.data),

  /** PATCH /api/v1/notifications/:id/ — mark a single notification read/unread. */
  markRead: (id: number, is_read = true) =>
    http.patch<Notification>(`/notifications/${id}/`, { is_read }).then((r) => r.data),

  /** Batch-mark all unread notifications as read.
   *  The backend has no bulk endpoint, so we PATCH each unread item individually.
   *  Errors are silently ignored per-item so one failure doesn't block others. */
  markAllRead: async (notifications: Notification[]): Promise<void> => {
    const unread = notifications.filter((n) => !n.is_read)
    await Promise.allSettled(
      unread.map((n) =>
        http.patch(`/notifications/${n.id}/`, { is_read: true }).catch(() => undefined),
      ),
    )
  },
}
