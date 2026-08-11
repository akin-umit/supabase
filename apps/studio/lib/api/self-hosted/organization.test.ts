import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getSelfHostedDailyUsage,
  getSelfHostedMembers,
  getSelfHostedOrganization,
  getSelfHostedOrganizationProjects,
  getSelfHostedRoles,
  getSelfHostedSubscription,
  getSelfHostedUsage,
  updateSelfHostedOrganization,
} from './organization'

describe('api/self-hosted/organization', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns a self-hosted organization without Cloud billing requirements', async () => {
    vi.stubEnv('DEFAULT_ORGANIZATION_NAME', 'Supabase Turkiye')

    await expect(getSelfHostedOrganization()).resolves.toMatchObject({
      integration_source: 'self-hosted',
      is_owner: true,
      name: 'Supabase Turkiye',
      plan: { id: 'enterprise', name: 'Self-hosted' },
      subscription_id: null,
      usage_billing_enabled: false,
    })
  })

  it('returns org project, team, role, subscription, and usage shapes without Cloud API calls', async () => {
    vi.stubEnv('DEFAULT_PROJECT_NAME', 'Local Studio')
    vi.stubEnv('DEFAULT_PROJECT_REF', 'default')
    vi.stubEnv('STUDIO_ADMIN_EMAIL', 'admin@example.test')

    await expect(
      getSelfHostedOrganizationProjects({ limit: 10, offset: 0 })
    ).resolves.toMatchObject({
      projects: [
        {
          ref: 'default',
          name: 'Local Studio',
          cloud_provider: 'self-hosted',
          organization_id: 1,
        },
      ],
      pagination: { count: 1, limit: 10, offset: 0 },
    })
    await expect(getSelfHostedMembers()).resolves.toMatchObject([
      { primary_email: 'admin@example.test', role_ids: [1] },
    ])
    expect(getSelfHostedRoles()).toMatchObject({
      org_scoped_roles: expect.arrayContaining([
        expect.objectContaining({ name: 'Owner', permissions: ['*'] }),
        expect.objectContaining({ name: 'Administrator', permissions: ['*'] }),
      ]),
      project_scoped_roles: [],
    })
    await expect(getSelfHostedSubscription()).resolves.toMatchObject({
      payment_method_type: 'self-hosted',
      plan: { id: 'enterprise', name: 'Self-hosted' },
      usage_billing_enabled: false,
    })
    await expect(getSelfHostedUsage()).resolves.toMatchObject({
      usages: expect.arrayContaining([
        expect.objectContaining({ metric: 'COMPUTE_HOURS_SM', unlimited: true }),
      ]),
    })
    await expect(getSelfHostedDailyUsage()).resolves.toEqual({ usages: [] })
  })

  it('updates only the organization display name in self-hosted mode', async () => {
    await expect(
      updateSelfHostedOrganization({ name: '  Aqenta Local  ', slug: 'ignored' })
    ).resolves.toMatchObject({
      name: 'Aqenta Local',
      slug: 'default-org-slug',
    })
  })
})
