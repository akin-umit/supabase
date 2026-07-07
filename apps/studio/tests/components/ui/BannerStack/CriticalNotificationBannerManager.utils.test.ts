import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  addSessionDismissedCriticalNotificationId,
  CRITICAL_NOTIFICATION_BANNER_SESSION_KEY,
  getCriticalNotificationBannerId,
  getSessionDismissedCriticalNotificationIds,
  shouldSurfaceCriticalNotification,
} from '@/components/ui/BannerStack/CriticalNotificationBannerManager.utils'
import type { Notification } from '@/data/notifications/notifications-v2-query'

const createNotification = (
  overrides: Partial<Notification> & { data?: Record<string, unknown> }
): Notification =>
  ({
    id: 'notification-1',
    status: 'new',
    priority: 'Critical',
    inserted_at: '2026-06-10T10:00:00Z',
    data: {
      title: 'Capacity unavailable',
      message: 'Unable to resize due to capacity.',
      actions: [],
    },
    ...overrides,
  }) as Notification

describe('CriticalNotificationBannerManager.utils', () => {
  describe('shouldSurfaceCriticalNotification', () => {
    it('surfaces project-scoped notifications on matching project pages', () => {
      const notification = createNotification({
        data: {
          title: 'Capacity unavailable',
          message: 'Unable to resize.',
          project_ref: 'project-ref',
          actions: [],
        },
      })

      expect(
        shouldSurfaceCriticalNotification(notification, {
          projectRef: 'project-ref',
          pathname: '/project/[ref]/settings/compute-and-disk',
        })
      ).toBe(true)
    })

    it('hides project-scoped notifications on other project pages', () => {
      const notification = createNotification({
        data: {
          title: 'Capacity unavailable',
          message: 'Unable to resize.',
          project_ref: 'other-ref',
          actions: [],
        },
      })

      expect(
        shouldSurfaceCriticalNotification(notification, {
          projectRef: 'project-ref',
          pathname: '/project/[ref]/settings/compute-and-disk',
        })
      ).toBe(false)
    })

    it('surfaces org-wide notifications on project pages', () => {
      const notification = createNotification({
        data: {
          title: 'Org notice',
          message: 'Message',
          actions: [],
        },
      })

      expect(
        shouldSurfaceCriticalNotification(notification, {
          projectRef: 'project-ref',
          pathname: '/project/[ref]',
        })
      ).toBe(true)
    })

    it('does not surface non-critical notifications', () => {
      const notification = createNotification({ priority: 'Warning' })

      expect(
        shouldSurfaceCriticalNotification(notification, {
          projectRef: 'project-ref',
          pathname: '/project/[ref]',
        })
      ).toBe(false)
    })
  })

  describe('getCriticalNotificationBannerId', () => {
    it('builds stable banner ids', () => {
      expect(getCriticalNotificationBannerId('abc')).toBe('critical-notification:abc')
    })
  })

  describe('session dismissal helpers', () => {
    beforeEach(() => {
      window.sessionStorage.clear()
    })

    afterEach(() => {
      window.sessionStorage.clear()
    })

    it('tracks dismissed notification ids in session storage', () => {
      expect(getSessionDismissedCriticalNotificationIds()).toEqual([])

      addSessionDismissedCriticalNotificationId('notification-1')

      expect(getSessionDismissedCriticalNotificationIds()).toEqual(['notification-1'])
      expect(window.sessionStorage.getItem(CRITICAL_NOTIFICATION_BANNER_SESSION_KEY)).toContain(
        'notification-1'
      )
    })
  })
})
