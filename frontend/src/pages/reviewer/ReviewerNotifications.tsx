import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  Clock,
  FileText,
  Filter as FilterIcon,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/states/EmptyState'
import { ErrorState } from '@/components/states/ErrorState'
import { ListSkeleton } from '@/components/states/LoadingSkeleton'
import { Reveal } from '@/components/motion/Reveal'
import {
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/useNotifications'
import { useTranslation } from '@/i18n/LanguageContext'
import { cn } from '@/lib/cn'
import type { Notification, NotificationEventType } from '@/types/notification'

export type NotificationFilter =
  | 'all'
  | 'unread'
  | 'read'
  | 'complaints'
  | 'escalations'
  | 'other'

// ── Event Icon & Color Mapping ───────────────────────────────────────────────

function getEventIcon(type: NotificationEventType) {
  switch (type) {
    case 'COMPLAINT_SUBMITTED':
    case 'COMPLAINT_STATUS_CHANGED':
      return MessageSquare
    case 'ESCALATION_CREATED':
    case 'ESCALATION_UPDATED':
      return TrendingUp
    case 'OFFICER_ASSIGNED':
      return ShieldAlert
    case 'OFFICER_ESCALATED':
      return AlertTriangle
    case 'REPORT_SUBMITTED':
    case 'REPORT_STATUS_CHANGED':
      return FileText
    case 'AI_ANALYSIS_COMPLETED':
      return Sparkles
    case 'FEEDBACK_SUBMITTED':
    case 'FEEDBACK_APPROVED':
    case 'FEEDBACK_REJECTED':
      return Star
    default:
      return Bell
  }
}

function getEventTone(type: NotificationEventType): {
  bg: string
  text: string
  badgeBg: string
  badgeText: string
} {
  switch (type) {
    case 'ESCALATION_CREATED':
    case 'ESCALATION_UPDATED':
    case 'OFFICER_ESCALATED':
      return {
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        badgeBg: 'bg-amber-50 border border-amber-200',
        badgeText: 'text-amber-800',
      }
    case 'COMPLAINT_SUBMITTED':
    case 'OFFICER_ASSIGNED':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        badgeBg: 'bg-blue-50 border border-blue-200',
        badgeText: 'text-blue-800',
      }
    case 'COMPLAINT_STATUS_CHANGED':
      return {
        bg: 'bg-cyan-100',
        text: 'text-cyan-800',
        badgeBg: 'bg-cyan-50 border border-cyan-200',
        badgeText: 'text-cyan-800',
      }
    case 'REPORT_SUBMITTED':
    case 'REPORT_STATUS_CHANGED':
      return {
        bg: 'bg-emerald-100',
        text: 'text-emerald-800',
        badgeBg: 'bg-emerald-50 border border-emerald-200',
        badgeText: 'text-emerald-800',
      }
    case 'AI_ANALYSIS_COMPLETED':
      return {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        badgeBg: 'bg-purple-50 border border-purple-200',
        badgeText: 'text-purple-800',
      }
    default:
      return {
        bg: 'bg-neutral-100',
        text: 'text-neutral-800',
        badgeBg: 'bg-neutral-50 border border-neutral-200',
        badgeText: 'text-neutral-700',
      }
  }
}

function formatRelativeTime(dateStr: string, language: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const secs = Math.floor(diff / 1000)
  const mins = Math.floor(secs / 60)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)

  if (secs < 60) return language === 'te' ? 'ఇప్పుడే' : 'Just now'
  if (mins < 60) return language === 'te' ? `${mins} నిమిషాల క్రితం` : `${mins}m ago`
  if (hrs < 24) return language === 'te' ? `${hrs} గంటల క్రితం` : `${hrs}h ago`
  if (days < 7) return language === 'te' ? `${days} రోజుల క్రితం` : `${days}d ago`

  return new Date(dateStr).toLocaleDateString(language === 'te' ? 'te-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ── Reviewer Notification Card ───────────────────────────────────────────────

interface ReviewerNotificationCardProps {
  notification: Notification
}

function ReviewerNotificationCard({ notification }: ReviewerNotificationCardProps) {
  const t = useTranslation()
  const navigate = useNavigate()
  const markRead = useMarkNotificationRead()
  const Icon = getEventIcon(notification.event_type)
  const tone = getEventTone(notification.event_type)

  const eventKey = `notifications.event.${notification.event_type}` as const

  const hasTarget = Boolean(notification.related_complaint || notification.related_report)

  function handleCardClick() {
    if (!notification.is_read) {
      markRead.mutate(notification.id)
    }
    if (notification.related_complaint) {
      navigate(`/reviewer/complaints/${notification.related_complaint}`)
    } else if (notification.related_report) {
      navigate(`/reviewer/reports/${notification.related_report}`)
    }
  }

  function handleMarkRead(e: React.MouseEvent) {
    e.stopPropagation()
    if (!notification.is_read) {
      markRead.mutate(notification.id)
    }
  }

  return (
    <div
      role="article"
      onClick={handleCardClick}
      className={cn(
        'group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4.5 transition-all duration-200',
        hasTarget && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover',
        notification.is_read
          ? 'border-neutral-200/80 bg-white/95 text-neutral-600 shadow-sm'
          : 'border-primary-200 bg-primary-50/40 text-neutral-900 shadow-card ring-1 ring-primary-100',
      )}
    >
      {/* Visual unread bar */}
      {!notification.is_read && (
        <span
          className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-md bg-primary-600"
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-lg shadow-xs transition-transform group-hover:scale-105',
            tone.bg,
            tone.text,
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
                tone.badgeBg,
                tone.badgeText,
              )}
            >
              {t(eventKey)}
            </span>

            {notification.related_complaint && (
              <span className="text-xs font-mono font-medium text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                Case #{notification.related_complaint}
              </span>
            )}

            {notification.related_report && (
              <span className="text-xs font-mono font-medium text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                Report #{notification.related_report}
              </span>
            )}

            <span className="flex items-center gap-1 text-xs text-neutral-400 ml-auto sm:ml-0">
              <Clock className="size-3" aria-hidden="true" />
              {formatRelativeTime(notification.created_at, t.language)}
            </span>
          </div>

          <p
            className={cn(
              'mt-1.5 text-sm leading-relaxed',
              notification.is_read ? 'text-neutral-600' : 'font-medium text-neutral-900',
            )}
          >
            {notification.localized_message || notification.message}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {!notification.is_read && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleMarkRead}
            disabled={markRead.isPending}
            className="text-xs h-8 text-neutral-600 hover:text-primary-700 hover:bg-white"
            title={t('notifications.markRead')}
          >
            <Check className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{t('notifications.markRead')}</span>
          </Button>
        )}

        {hasTarget && (
          <div
            className="flex size-8 items-center justify-center rounded-lg text-neutral-400 group-hover:text-primary-600 group-hover:bg-primary-50 transition-colors"
            aria-hidden="true"
          >
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Reviewer Notifications Component ───────────────────────────────────

export default function ReviewerNotifications() {
  const t = useTranslation()
  const [filter, setFilter] = useState<NotificationFilter>('all')

  const { data, isLoading, isError, refetch } = useNotifications()
  const markAll = useMarkAllRead()

  const notifications = data ?? []

  // Calculated counts
  const totalCount = notifications.length
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  )
  const readCount = totalCount - unreadCount

  const complaintsCount = useMemo(
    () =>
      notifications.filter(
        (n) =>
          n.event_type.startsWith('COMPLAINT_') ||
          n.event_type.startsWith('OFFICER_'),
      ).length,
    [notifications],
  )

  const escalationsCount = useMemo(
    () =>
      notifications.filter(
        (n) =>
          n.event_type.startsWith('ESCALATION_') ||
          n.event_type === 'OFFICER_ESCALATED',
      ).length,
    [notifications],
  )

  const otherCount = totalCount - complaintsCount - escalationsCount

  // Action required: unread complaints or escalations
  const actionRequiredCount = useMemo(
    () =>
      notifications.filter(
        (n) =>
          !n.is_read &&
          (n.event_type.startsWith('COMPLAINT_') ||
            n.event_type.startsWith('ESCALATION_') ||
            n.event_type.startsWith('OFFICER_')),
      ).length,
    [notifications],
  )

  // Filtered notifications
  const displayedNotifications = useMemo(() => {
    switch (filter) {
      case 'unread':
        return notifications.filter((n) => !n.is_read)
      case 'read':
        return notifications.filter((n) => n.is_read)
      case 'complaints':
        return notifications.filter(
          (n) =>
            n.event_type.startsWith('COMPLAINT_') ||
            n.event_type.startsWith('OFFICER_'),
        )
      case 'escalations':
        return notifications.filter(
          (n) =>
            n.event_type.startsWith('ESCALATION_') ||
            n.event_type === 'OFFICER_ESCALATED',
        )
      case 'other':
        return notifications.filter(
          (n) =>
            !n.event_type.startsWith('COMPLAINT_') &&
            !n.event_type.startsWith('ESCALATION_') &&
            !n.event_type.startsWith('OFFICER_'),
        )
      case 'all':
      default:
        return notifications
    }
  }, [filter, notifications])

  const tabs: Array<{ key: NotificationFilter; label: string; count: number }> = [
    { key: 'all', label: t('notifications.filterAll'), count: totalCount },
    { key: 'unread', label: t('notifications.filterUnread'), count: unreadCount },
    { key: 'read', label: t('notifications.filterRead'), count: readCount },
    { key: 'complaints', label: t('notifications.filterComplaints'), count: complaintsCount },
    { key: 'escalations', label: t('notifications.filterEscalations'), count: escalationsCount },
    { key: 'other', label: t('notifications.filterOther'), count: otherCount },
  ]

  return (
    <AppShell title={t('notifications.title')}>
      <div className="space-y-6">
        {/* ── Header ── */}
        <Reveal variant="fade">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                  {t('notifications.title')}
                </h1>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-bold text-primary-800">
                    {t('notifications.unread', { count: unreadCount })}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                {t('notifications.reviewerSubtitle')}
              </p>
            </div>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAll.mutate()}
                isLoading={markAll.isPending}
                className="shrink-0 font-medium"
              >
                <CheckCheck className="size-4" aria-hidden="true" />
                {t('notifications.markAllRead')}
              </Button>
            )}
          </div>
        </Reveal>

        {/* ── Summary KPI Cards ── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm">
            <span className="text-xs font-medium text-neutral-500">
              {t('notifications.total')}
            </span>
            <p className="mt-1.5 text-2xl font-bold text-neutral-900">{totalCount}</p>
          </div>

          <div className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm">
            <span className="text-xs font-medium text-primary-600">
              {t('notifications.filterUnread')}
            </span>
            <p className="mt-1.5 text-2xl font-bold text-primary-600">{unreadCount}</p>
          </div>

          <div className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm">
            <span className="text-xs font-medium text-neutral-500">
              {t('notifications.read')}
            </span>
            <p className="mt-1.5 text-2xl font-bold text-neutral-700">{readCount}</p>
          </div>

          <div className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm">
            <span className="text-xs font-medium text-amber-600">
              {t('notifications.actionRequired')}
            </span>
            <p className="mt-1.5 text-2xl font-bold text-amber-600">
              {actionRequiredCount}
            </p>
          </div>
        </div>

        {/* ── Filter Tabs ── */}
        <div
          role="tablist"
          aria-label="Filter notifications"
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-neutral-200/80"
        >
          {tabs.map((tab) => {
            const isActive = filter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  'inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-700 font-semibold'
                    : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700',
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-semibold',
                    isActive
                      ? 'bg-primary-100 text-primary-800'
                      : 'bg-neutral-100 text-neutral-600',
                  )}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Content States ── */}
        {isLoading && <ListSkeleton items={4} />}

        {isError && (
          <ErrorState
            title={t('notifications.loadError')}
            message={t('notifications.loadError')}
            onRetry={() => {
              void refetch()
            }}
          />
        )}

        {!isLoading && !isError && displayedNotifications.length === 0 && (
          <EmptyState
            icon={
              filter === 'all' ? (
                <Bell className="size-6" aria-hidden="true" />
              ) : (
                <FilterIcon className="size-6" aria-hidden="true" />
              )
            }
            title={
              filter === 'all'
                ? t('notifications.emptyTitle')
                : t('notifications.noNotifications')
            }
            description={
              filter === 'all'
                ? t('notifications.emptyDesc')
                : 'No notifications found matching the selected filter criteria.'
            }
          />
        )}

        {!isLoading && !isError && displayedNotifications.length > 0 && (
          <div className="space-y-3">
            {displayedNotifications.map((notification) => (
              <ReviewerNotificationCard
                key={notification.id}
                notification={notification}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
