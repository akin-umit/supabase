import { describe, expect, it } from 'vitest'

import {
  getSelfHostedOrganization,
  getSelfHostedRoles,
  getSelfHostedSubscription,
  getSelfHostedUsage,
} from './organization'

describe('self-hosted organization API helpers', () => {
  it('marks the default organization as self-hosted', async () => {
    await expect(getSelfHostedOrganization()).resolves.toMatchObject({
      integration_source: 'self-hosted',
      usage_billing_enabled: false,
      plan: { name: 'Self-hosted' },
    })
  })

  it('returns the role shape expected by organization team views', () => {
    const roles = getSelfHostedRoles()

    expect(roles.org_scoped_roles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          name: 'Owner',
          permissions: ['*'],
        }),
      ])
    )
    expect(roles.project_scoped_roles).toEqual([])
  })

  it('uses the current month for self-hosted subscription windows', async () => {
    const subscription = await getSelfHostedSubscription()

    expect(subscription.payment_method_type).toBe('self-hosted')
    expect(subscription.current_period_start).toBeGreaterThan(1_600_000_000)
    expect(subscription.current_period_end).toBeGreaterThan(subscription.current_period_start)
  })

  it('returns self-hosted unlimited usage metrics instead of billing-only empties', async () => {
    const usage = await getSelfHostedUsage()

    expect(usage.usages.map((item) => item.metric)).toEqual(
      expect.arrayContaining(['COMPUTE_HOURS_SM', 'DATABASE_SIZE', 'STORAGE_SIZE'])
    )
    expect(usage.usages.every((item) => item.unlimited)).toBe(true)
  })
})
