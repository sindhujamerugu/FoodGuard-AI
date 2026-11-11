import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BellOff,
  CheckCheck,
  FileText,
  MessageSquare,
  ShieldAlert,
  Sparkles,
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function eventIcon(type: NotificationEventType) {
  switch (type) {
    case 'REPORT_SUBMITTED':
    case 'REPORT_STATUS_CHANGED':
      return FileText
    case 'AI_ANALYSIS_COMPLETED':
      return Sparkles
    case 'COMPLAINT_SUBMITTED':
    case 'COMPLAINT_STATUS_CHANGED':
      return MessageSquare
    case 'ESCALATION_CREATED':
    case 'ESCALATION_UPDATED':
      return TrendingUp
    default:
      return Bell
  }
}

function eventTone(type: NotificationEventType): 'primary' | 'warning' | 'success' | 'danger' | 'info' {
  switch (type) {
    case 'AI_ANALYSIS_COMPLETED': return 'primary'
    case 'ESCALATION_CREATED': return 'warning'
    case 'ESCALATION_UPDATED': return 'warning'
    case 'REPORT_STATUS_CHANGED': return 'info'
    case 'COMPLAINT_STATUS_CHANGED': return 'info'
    default: return 'primary'
  }
}

const toneIcon: Record<string, string> = {
  primary: 'bg-primary-100 text-primary-700',
  warning: 'bg-warning-100 text-warning-700',
  success: 'bg-success-100 text-success-700',
  danger:  'bg-danger-100 text-danger-700',
  info:    'bg-info-100 text-info-600',
}

function relativeTime(dateStr: string, language: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const secs = Math.floor(diff / 1000)
  const mins = Math.floor(secs / 60)
  const hrs  = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  const te   = language === 'te'

  if (secs < 60)  return te ? 'ఇప్పుడే' : 'Just now'
  if (mins < 60)  return te ? `${mins} నిమిషాల క్రితం` : `${mins}m ago`
  if (hrs < 24)   return te ? `${hrs} గంటల క్రితం`  : `${hrs}h ago`
  if (days < 7)   return te ? `${days} రోజుల క్రితం`  : `${days}d ago`
  return new Date(dateStr).toLocaleDateString(language === 'te' ? 'te-IN' : 'en-IN', {
    day: 'numeric', month: 'short',
  })
}

// ── NotificationItem ──────────────────────────────────────────────────────────

function NotificationItem({ notification }: { notification: Notification }) {
  const t      = useTranslation()
  const nav    = useNavigate()
  const mark   = useMarkNotificationRead()
  const Icon   = eventIcon(notification.event_type)
  const tone   = eventTone(notification.event_type)
  const { language } = t

  function handleClick() {
    if (!notification.is_read) {
      mark.mutate(notification.id)
    }
    if (notification.related_report) {
      nav(`/reports/${notification.related_report}`)
    } else if (notification.related_complaint) {
      nav(`/complaints/${notification.related_complaint}`)
    }
  }

  const eventKey = `notifications.event.${notification.event_type}` as const

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'group relative w-full text-left flex items-start gap-4 rounded-2xl border p-4 transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500',
        notification.is_read
          ? 'border-neutral-100 bg-white shadow-card'
          : 'border-primary-200 bg-primary-50/60 shadow-card',
      )}
    >
      {/* Unread indicator stripe */}
      {!notification.is_read && (
        <span
          className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-primary-500"
          aria-hidden="true"
        />
      )}

      {/* Icon */}
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', toneIcon[tone])}>
        <Icon className="size-4.5" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm leading-snug', notification.is_read ? 'text-neutral-700' : 'font-medium text-neutral-900')}>
          {notification.localized_message || notification.message}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className={cn('inline-block rounded-full px-2 py-0.5 text-[11px] font-medium', toneIcon[tone])}>
            {t(eventKey)}
          </span>
          <span className="text-xs text-neutral-400">
            {relativeTime(notification.created_at, language)}
          </span>
        </div>
      </div>

      {/* Unread dot */}
      {!notification.is_read && (
        <span className="mt-1 flex size-2 shrink-0 rounded-full bg-primary-500" aria-label="Unread" />
      )}
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Filter = 'all' | 'unread'

export default function Notifications() {
  const t = useTranslation()
  const [filter, setFilter] = useState<Filter>('all')

  const { data, isLoading, isError, refetch } = useNotifications()
  const markAll = useMarkAllRead()

  const notifications = data ?? []
  const unreadCount   = notifications.filter((n) => !n.is_read).length
  const displayed     = filter === 'unread'
    ? notifications.filter((n) => !n.is_read)
    : notifications

  const tabs: { key: Filter; label: string; count?: number }[] = [
    { key: 'all',    label: t('notifications.filterAll'),    count: notifications.length },
    { key: 'unread', label: t('notifications.filterUnread'), count: unreadCount },
  ]

  return (
    <AppShell title={t('notifications.title')}>
      {/* ── Header ── */}
      <Reveal variant="fade" className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-primary-900">{t('notifications.heading')}</h2>
            <p className="mt-1 text-sm text-neutral-500">{t('notifications.subtitle')}</p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              isLoading={markAll.isPending}
              onClick={() => markAll.mutate()}
              className="shrink-0"
            >
              <CheckCheck className="size-4" aria-hidden="true" />
              {t('notifications.markAllRead')}
            </Button>
          )}
        </div>
      </Reveal>

      {/* ── Filter tabs ── */}
      <div className="mb-6 flex gap-1 rounded-xl border border-neutral-200 bg-white p-1 shadow-sm w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
              filter === tab.key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-neutral-600 hover:bg-neutral-50',
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={cn(
                  'flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                  filter === tab.key ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {isLoading && <ListSkeleton items={5} />}

      {isError && (
        <ErrorState message={t('notifications.loadError')} onRetry={() => refetch()} />
      )}

      {!isLoading && !isError && displayed.length === 0 && (
        <EmptyState
          icon={<BellOff className="size-6" aria-hidden="true" />}
          title={t('notifications.emptyTitle')}
          description={t('notifications.emptyDesc')}
        />
      )}

      {!isLoading && !isError && displayed.length > 0 && (
        <div className="space-y-3">
          {displayed.map((n, i) => (
            <Reveal key={n.id} delay={i * 40}>
              <NotificationItem notification={n} />
            </Reveal>
          ))}
        </div>
      )}
    </AppShell>
  )
}
