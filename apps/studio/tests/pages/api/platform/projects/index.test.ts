import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import handler from '../../../../../pages/api/platform/projects'

vi.mock('@/lib/constants', () => ({
  IS_PLATFORM: false,
  API_URL: 'https://api.example.com',
}))

describe('/api/platform/projects', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('creates a self-hosted project through the management API bridge', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal/base?secret=yes')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_WRITE_TOKEN', 'write-token')
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          project: {
            id: 42,
            ref: 'demo-project-a1b2c3',
            name: 'Demo Project',
            region: 'local-vps',
            status: 'COMING_UP',
            apiHostname: 'api.demo-project-a1b2c3.example.com',
            createdAt: '2026-08-16T00:00:00.000Z',
          },
          job: { id: 'job-1' },
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        name: 'Demo Project',
        organization_slug: 'default-org-slug',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(202)
    expect(String(fetchMock.mock.calls[0][0])).toBe('http://management.internal/v1/projects')
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST')
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: 'Bearer write-token',
    })
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    expect(requestBody.name).toBe('Demo Project')
    expect(requestBody.ref).toMatch(/^demo-project-[a-z0-9]{6}$/)
    expect(requestBody).not.toHaveProperty('baseDomainId')
    expect(requestBody).not.toHaveProperty('cloud_provider')
    expect(requestBody).not.toHaveProperty('db_pass')
    expect(requestBody).not.toHaveProperty('desired_instance_size')

    const data = JSON.parse(res._getData())
    expect(data).toMatchObject({
      ref: 'demo-project-a1b2c3',
      name: 'Demo Project',
      organization_slug: 'default-org-slug',
      region: 'local-vps',
      endpoint: 'https://api.demo-project-a1b2c3.example.com',
    })
  })

  it('returns a clear self-hosted bridge error when project provisioning is not configured', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        name: 'Demo Project',
        organization_slug: 'default-org-slug',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(503)
    expect(JSON.parse(res._getData()).error.message).toContain(
      'Self-hosted project creation requires the management API write bridge'
    )
  })

  it('rejects cloud create fields on the self-hosted project route', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        name: 'Demo Project',
        organization_slug: 'default-org-slug',
        cloud_provider: 'AWS',
        db_pass: 'secret-password',
        desired_instance_size: 'micro',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    expect(JSON.parse(res._getData()).error.message).toContain(
      'does not accept cloud project fields'
    )
  })
})
