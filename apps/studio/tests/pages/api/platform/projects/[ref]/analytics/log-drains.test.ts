import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import listHandler from '../../../../../../../pages/api/platform/projects/[ref]/analytics/log-drains'
import itemHandler from '../../../../../../../pages/api/platform/projects/[ref]/analytics/log-drains/[uuid]'

vi.mock('@/lib/constants', () => ({
  IS_PLATFORM: false,
  API_URL: 'https://api.example.com',
}))

vi.mock('@/lib/constants/api', () => ({
  PROJECT_ANALYTICS_URL: 'http://analytics:4000/api/',
}))

describe('/api/platform/projects/[ref]/analytics/log-drains', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('returns service-unavailable for self-hosted log drain routes without Logflare credentials', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { ref: 'default' } })

    await listHandler(req, res)

    expect(res._getStatusCode()).toBe(503)
    expect(JSON.parse(res._getData()).error.message).toContain('LOGFLARE_PRIVATE_ACCESS_TOKEN')
  })

  it('lists project log drains from Logflare backends when configured', async () => {
    vi.stubEnv('LOGFLARE_URL', 'http://analytics:4000')
    vi.stubEnv('LOGFLARE_PRIVATE_ACCESS_TOKEN', 'private-token')
    const fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: 1, token: 'drain-token', metadata: { type: 'log-drain' } }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetch)
    const { req, res } = createMocks({ method: 'GET', query: { ref: 'default' } })

    await listHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(fetch).toHaveBeenCalledWith(
      new URL('http://analytics:4000/api/backends?metadata%5Btype%5D=log-drain'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer private-token' }),
      })
    )
    expect(JSON.parse(res._getData())[0].token).toBe('drain-token')
  })

  it('tests an existing Logflare backend through the project log drain endpoint', async () => {
    vi.stubEnv('LOGFLARE_URL', 'http://analytics:4000')
    vi.stubEnv('LOGFLARE_PRIVATE_ACCESS_TOKEN', 'private-token')
    const fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetch)
    const { req, res } = createMocks({
      method: 'POST',
      query: { ref: 'default', uuid: 'drain-token' },
      body: { action: 'test' },
    })

    await itemHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(fetch).toHaveBeenCalledWith(
      new URL('http://analytics:4000/api/backends/drain-token/test'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})
