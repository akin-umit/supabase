import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import handler from '../../../../../../pages/api/platform/projects/[ref]/infra-monitoring'

vi.mock('@/lib/constants', () => ({
  IS_PLATFORM: false,
  API_URL: 'https://api.example.com',
}))

vi.mock('@/lib/api/self-hosted/logs', () => ({
  retrieveAnalyticsData: vi.fn(),
}))

describe('/api/platform/projects/[ref]/infra-monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an empty self-host response instead of 501 for unsupported host metrics', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        ref: 'default',
        attributes: ['cpu', 'memory'],
        startDate: '2026-08-11T00:00:00.000Z',
        endDate: '2026-08-11T01:00:00.000Z',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.data).toEqual([])
    expect(data.series.cpu.total).toBe(0)
    expect(data.series.memory.total).toBe(0)
    expect(data.self_hosted.reason).toContain('Unsupported self-hosted infra metrics')
  })

  it('returns an empty self-host response instead of 500 when Logflare metrics fail', async () => {
    const { retrieveAnalyticsData } = await import('@/lib/api/self-hosted/logs')
    vi.mocked(retrieveAnalyticsData).mockResolvedValueOnce({
      data: undefined,
      error: new Error('Logflare request failed'),
    })

    const { req, res } = createMocks({
      method: 'GET',
      query: {
        ref: 'default',
        attributes: ['realtime_channel_events'],
        startDate: '2026-08-11T00:00:00.000Z',
        endDate: '2026-08-11T01:00:00.000Z',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.data).toEqual([])
    expect(data.series.realtime_channel_events.total).toBe(0)
    expect(data.self_hosted.reason).toBe('Logflare request failed')
  })
})
