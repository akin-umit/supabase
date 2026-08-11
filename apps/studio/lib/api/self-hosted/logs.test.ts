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
      expect.objectContaining({ method: 'GET', signal: expect.any(AbortSignal) })
    )
  })

  it('maps self-hosted functions combined stats to the local Logflare logs endpoint', async () => {
    vi.stubEnv('LOGFLARE_PRIVATE_ACCESS_TOKEN', 'private-token')
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetch)

    const { retrieveAnalyticsData } = await import('./logs')
    await retrieveAnalyticsData({
      name: 'functions.combined-stats',
      projectRef: 'default',
      params: { function_id: 'hello-world', interval: '15min' },
    })

    const url = fetch.mock.calls[0][0] as URL
    expect(url.pathname).toBe('/api/endpoints/query/logs.all')
    expect(url.searchParams.get('project')).toBe('default')
    expect(url.searchParams.get('sql')).toContain('from function_edge_logs as fel')
    expect(url.searchParams.get('sql')).toContain("where function_id = 'hello-world'")
    expect(url.searchParams.get('sql')).toContain('requests_count')
  })

  it('maps self-hosted service health to a local Logflare logs query', async () => {
    vi.stubEnv('LOGFLARE_PRIVATE_ACCESS_TOKEN', 'private-token')
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetch)

    const { retrieveAnalyticsData } = await import('./logs')
    await retrieveAnalyticsData({
      name: 'service-health',
      projectRef: 'default',
      params: {
        iso_timestamp_start: '2026-08-11T00:00:00.000Z',
        iso_timestamp_end: '2026-08-11T01:00:00.000Z',
        granularity: 'hour',
      },
    })

    const url = fetch.mock.calls[0][0] as URL
    expect(url.pathname).toBe('/api/endpoints/query/logs.all')
    expect(url.searchParams.get('project')).toBe('default')
    expect(url.searchParams.get('sql')).toContain('from edge_logs as el')
    expect(url.searchParams.get('sql')).toContain('postgres_logs')
    expect(url.searchParams.get('sql')).toContain('function_edge_logs')
  })

  it('rejects unsupported self-hosted analytics endpoint names', async () => {
    vi.stubEnv('LOGFLARE_PRIVATE_ACCESS_TOKEN', 'private-token')

    const { retrieveAnalyticsData } = await import('./logs')
    const { error } = await retrieveAnalyticsData({
      name: 'billing.usage',
      projectRef: 'default',
      params: {},
    })

    expect(error?.message).toContain('Unsupported self-hosted analytics endpoint')
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
