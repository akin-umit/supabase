import { isCriticalUnreadNotification } from '@/components/ui/AdvisorPanel/useAdvisorAttention.utils'
import type { Notification, NotificationData } from '@/data/notifications/notifications-v2-query'

export const CRITICAL_NOTIFICATION_BANNER_ID_PREFIX = 'critical-notification:' as const

export function getCriticalNotificationBannerId(notificationId: string) {
  return `${CRITICAL_NOTIFICATION_BANNER_ID_PREFIX}${notificationId}` as const
}

export function shouldSurfaceCriticalNotification(
  notification: Notification,
  {
    projectRef,
    pathname,
  }: {
    projectRef?: string
    pathname: string
  }
) {
  if (!isCriticalUnreadNotification(notification)) return false

  const data = notification.data as NotificationData
  const notificationProjectRef = data.project_ref
  const notificationOrgSlug = data.org_slug

  if (pathname.startsWith('/project/') && projectRef) {
    return !notificationProjectRef || notificationProjectRef === projectRef
  }

  if (pathname.startsWith('/org/')) {
    const orgSlug = pathname.split('/')[2]
    if (notificationProjectRef) return false
    return !notificationOrgSlug || notificationOrgSlug === orgSlug
  }

  if (pathname.startsWith('/account')) {
    return !notificationProjectRef
  }

  return !notificationProjectRef
}

export const CRITICAL_NOTIFICATION_BANNER_SESSION_KEY = 'critical-notification-banners-dismissed'

export function getSessionDismissedCriticalNotificationIds(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const value = window.sessionStorage.getItem(CRITICAL_NOTIFICATION_BANNER_SESSION_KEY)
    if (!value) return []
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function addSessionDismissedCriticalNotificationId(notificationId: string) {
  if (typeof window === 'undefined') return

  const current = new Set(getSessionDismissedCriticalNotificationIds())
  current.add(notificationId)
  window.sessionStorage.setItem(
    CRITICAL_NOTIFICATION_BANNER_SESSION_KEY,
    JSON.stringify([...current])
  )
}
