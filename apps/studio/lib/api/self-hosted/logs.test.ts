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

  it('builds self-hosted log queries against Logflare source aliases', async () => {
    const { getLogQuery } = await import('./logs')

    const apiSql = getLogQuery('api', 25)
    expect(apiSql).toContain('from edge_logs as el')
    expect(apiSql).toContain('cross join unnest(el.metadata) as m')
    expect(apiSql).toContain('request.method as method')
    expect(apiSql).toContain('response.status_code as status_code')
    expect(apiSql).toContain('limit 25')

    const postgresSql = getLogQuery('postgres', 10)
    expect(postgresSql).toContain('from postgres_logs as pgl')
    expect(postgresSql).toContain('cross join unnest(pgl.metadata) as m')
    expect(postgresSql).toContain('parsed.error_severity as error_severity')
  })
})
