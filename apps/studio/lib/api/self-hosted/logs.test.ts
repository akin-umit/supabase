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

  it('builds self-hosted log queries against the ClickHouse logs table', async () => {
    const { getLogQuery } = await import('./logs')

    const apiSql = getLogQuery('api', 25)
    expect(apiSql).toContain('from logs')
    expect(apiSql).toContain("source = 'edge_logs'")
    expect(apiSql).toContain("log_attributes['request.method']")
    expect(apiSql).toContain('limit 25')

    const postgresSql = getLogQuery('postgres', 10)
    expect(postgresSql).toContain('from logs')
    expect(postgresSql).toContain("source = 'postgres_logs'")
    expect(postgresSql).toContain("log_attributes['parsed.error_severity']")
  })
})
