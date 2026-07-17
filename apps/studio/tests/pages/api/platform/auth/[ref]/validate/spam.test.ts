import { createMocks } from 'node-mocks-http'
import { describe, expect, it, vi } from 'vitest'

import handler from '../../../../../../../pages/api/platform/auth/[ref]/validate/spam'

vi.mock('@/lib/constants', () => ({
  IS_PLATFORM: false,
  API_URL: 'https://api.example.com',
}))

describe('/api/platform/auth/[ref]/validate/spam', () => {
  it('returns an empty rule set for self-hosted deployments', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: { ref: 'default' },
      body: { subject: 'Welcome', body: 'Hello' },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toEqual({ rules: [] })
  })

  it('returns 405 for unsupported methods', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { ref: 'default' } })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    expect(res.getHeader('Allow')).toBe('POST')
  })
})
