import { createMocks } from 'node-mocks-http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

  afterEach(() => {
    vi.restoreAllMocks()
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
    expect(data.MAILER_SUBJECTS_CONFIRMATION).toBe('Confirm your signup')
    expect(data.MAILER_TEMPLATES_CONFIRMATION_CONTENT).toContain('{{ .ConfirmationURL }}')
  })

  it('uses management API data for GET when the self-host control plane is configured', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_TOKEN', 'read-token')
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ SITE_URL: 'https://managed.example.com' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const { req, res } = createMocks({ method: 'GET', query: { ref: 'default' } })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData()).SITE_URL).toBe('https://managed.example.com')
  })

  it('does not pretend runtime auth config updates are supported', async () => {
    const { req, res } = createMocks({ method: 'PATCH', query: { ref: 'default' } })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(503)
    expect(JSON.parse(res._getData()).error.message).toContain('Management API is not configured')
  })

  it('returns 405 for unsupported methods', async () => {
    const { req, res } = createMocks({ method: 'POST', query: { ref: 'default' } })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    expect(res.getHeader('Allow')).toEqual(['GET', 'PATCH'])
  })
})
