import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import handler from '../../../../../../../pages/api/platform/projects/[ref]/analytics/endpoints/[name]'

vi.mock('@/lib/constants', () => ({
  IS_PLATFORM: false,
  API_URL: 'https://api.example.com',
}))

vi.mock('@/lib/api/self-hosted/logs', () => ({
  getEmptyAnalyticsResult: vi.fn((name: string) =>
    name === 'service-health'
      ? { result: [{ timestamp: '2026-08-11T00:00:00.000Z' }] }
      : { result: [] }
  ),
  retrieveAnalyticsData: vi.fn(),
}))

describe('/api/platform/projects/[ref]/analytics/endpoints/[name]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns Logflare data when the self-host analytics query succeeds', async () => {
    const { retrieveAnalyticsData } = await import('@/lib/api/self-hosted/logs')
    vi.mocked(retrieveAnalyticsData).mockResolvedValueOnce({
      data: { result: [{ id: 'row-1' }] },
      error: undefined,
    })

    const { req, res } = createMocks({
      method: 'GET',
      query: { ref: 'default', name: 'logs.all', sql: 'select 1' },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toEqual({ result: [{ id: 'row-1' }] })
  })

  it('does not return 500 loops when the self-host analytics backend is unavailable', async () => {
    const { retrieveAnalyticsData } = await import('@/lib/api/self-hosted/logs')
    vi.mocked(retrieveAnalyticsData).mockResolvedValueOnce({
      data: undefined,
      error: new Error('LOGFLARE_PRIVATE_ACCESS_TOKEN is required'),
    })

    const { req, res } = createMocks({
      method: 'POST',
      query: { ref: 'default', name: 'logs.all' },
      body: { sql: 'select 1' },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.result).toEqual([])
    expect(data.self_hosted).toMatchObject({
      degraded: true,
      reason: 'LOGFLARE_PRIVATE_ACCESS_TOKEN is required',
    })
  })
})
