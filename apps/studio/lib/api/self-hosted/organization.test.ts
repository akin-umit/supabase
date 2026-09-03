import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getSelfHostedAuditLogs,
  getSelfHostedAvailableRegions,
  getSelfHostedDailyUsage,
  getSelfHostedMembers,
  getSelfHostedOrganization,
  getSelfHostedOrganizationProjects,
  getSelfHostedRoles,
  getSelfHostedSubscription,
  getSelfHostedUsage,
  updateSelfHostedOrganization,
} from './organization'

vi.mock('@/lib/api/self-hosted/management', () => ({
  SelfHostedManagementError: class SelfHostedManagementError extends Error {
    constructor(
      message: string,
      public statusCode = 500
    ) {
      super(message)
      this.name = 'SelfHostedManagementError'
    }
  },
  requestSelfHostedManagementRoot: vi.fn(),
}))

describe('api/self-hosted/organization', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
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
    expect(getSelfHostedAvailableRegions()).toMatchObject({
      all: {
        smartGroup: [expect.objectContaining({ name: 'Local VPS', type: 'smartGroup' })],
        specific: [expect.objectContaining({ name: 'Local VPS', type: 'specific' })],
      },
      recommendations: {
        smartGroup: expect.objectContaining({ name: 'Local VPS', type: 'smartGroup' }),
        specific: [expect.objectContaining({ name: 'Local VPS', type: 'specific' })],
      },
    })
    await expect(getSelfHostedMembers()).resolves.toMatchObject([
      { primary_email: 'admin@example.test', role_ids: [1] },
    ])
    expect(getSelfHostedRoles()).toMatchObject({
      org_scoped_roles: expect.arrayContaining([
        expect.objectContaining({ name: 'Owner', permissions: ['*'], projects: [] }),
        expect.objectContaining({ name: 'Administrator', permissions: ['*'], projects: [] }),
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
    await expect(
      getSelfHostedAuditLogs({
        slug: 'default-org-slug',
        iso_timestamp_start: '2026-08-01T00:00:00.000Z',
        iso_timestamp_end: '2026-08-11T00:00:00.000Z',
      })
    ).resolves.toMatchObject({
      result: [
        {
          organization_slug: 'default-org-slug',
          action: { name: 'self_hosted.audit.available', status: 200 },
          actor: { email: 'admin@example.test' },
        },
      ],
      retention_period: 90,
    })
  })

  it('maps the default route alias to the configured tenant project ref', async () => {
    vi.stubEnv('DEFAULT_PROJECT_REF', 'tenant-project')

    const { getSelfHostedProject } = await import('./organization')

    expect(getSelfHostedProject('default').ref).toBe('tenant-project')
    expect(getSelfHostedProject('explicit-project').ref).toBe('explicit-project')
  })

  it('updates only the organization display name in self-hosted mode', async () => {
    await expect(
      updateSelfHostedOrganization({ name: '  Aqenta Local  ', slug: 'ignored' })
    ).resolves.toMatchObject({
      name: 'Aqenta Local',
      slug: 'default-org-slug',
    })
  })

  it('merges local management registry projects into organization project lists', async () => {
    const { requestSelfHostedManagementRoot } = await import('@/lib/api/self-hosted/management')
    vi.mocked(requestSelfHostedManagementRoot).mockResolvedValueOnce({
      projects: [
        {
          ref: 'aqenta-admin',
          name: 'Aqenta Admin',
          status: 'running',
          desiredInstanceSize: 'medium',
          region: 'local-vps',
          studioHostname: 'aqenta-admin.aqenta.com.tr',
          apiHostname: 'api.aqenta-admin.aqenta.com.tr',
          createdAt: '2026-08-29T00:00:00.000Z',
        },
      ],
    })

    await expect(
      getSelfHostedOrganizationProjects({ limit: 10, offset: 0, search: 'aqenta-admin' })
    ).resolves.toMatchObject({
      projects: [
        {
          ref: 'aqenta-admin',
          name: 'Aqenta Admin',
          status: 'ACTIVE_HEALTHY',
          cloud_provider: 'self-hosted',
          databases: [
            {
              identifier: 'aqenta-admin',
              infra_compute_size: 'medium',
            },
          ],
          app_config: {
            custom_domains: ['aqenta-admin.aqenta.com.tr', 'api.aqenta-admin.aqenta.com.tr'],
          },
        },
      ],
      pagination: { count: 1, limit: 10, offset: 0 },
    })
  })
})
