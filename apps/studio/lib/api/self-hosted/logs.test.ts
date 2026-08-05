import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./util', () => ({ assertSelfHosted: vi.fn() }))
vi.mock('@/lib/constants/api', () => ({ PROJECT_ANALYTICS_URL: 'http://analytics:4000' }))

describe('self-hosted Logflare queries', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('normalizes a host-only Logflare URL to its query API', async () => {
    vi.stubEnv('LOGFLARE_PRIVATE_ACCESS_TOKEN', 'private-token')
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetch)

    const { retrieveAnalyticsData } = await import('./logs')
    await retrieveAnalyticsData({ name: 'logs.all', projectRef: 'default', params: {} })

    expect(fetch).toHaveBeenCalledWith(
      new URL('http://analytics:4000/api/endpoints/query/logs.all?project=default'),
      expect.objectContaining({ method: 'GET' })
    )
  })
})
