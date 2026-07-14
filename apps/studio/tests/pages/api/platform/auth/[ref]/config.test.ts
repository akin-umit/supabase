import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import handler from '../../../../../../pages/api/platform/auth/[ref]/config'

vi.mock('@/lib/constants', () => ({
  IS_PLATFORM: false,
  API_URL: 'https://api.example.com',
}))

vi.mock('@/lib/constants/api', () => ({
  PROJECT_ENDPOINT: 'supabase.example.com',
  PROJECT_ENDPOINT_PROTOCOL: 'https',
}))

describe('/api/platform/auth/[ref]/config', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns self-host auth config for GET', async () => {
    vi.stubEnv('SITE_URL', 'https://app.example.com')

    const { req, res } = createMocks({ method: 'GET', query: { ref: 'default' } })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.SITE_URL).toBe('https://app.example.com')
    expect(data.EXTERNAL_EMAIL_ENABLED).toBe(true)
    expect(data.EXTERNAL_GITHUB_ENABLED).toBe(false)
  })

  it('does not pretend runtime auth config updates are supported', async () => {
    const { req, res } = createMocks({ method: 'PATCH', query: { ref: 'default' } })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(501)
    expect(JSON.parse(res._getData()).error.message).toContain('not implemented')
  })

  it('returns 405 for unsupported methods', async () => {
    const { req, res } = createMocks({ method: 'POST', query: { ref: 'default' } })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    expect(res.getHeader('Allow')).toEqual(['GET', 'PATCH'])
  })
})
