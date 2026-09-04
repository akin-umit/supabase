import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import handler from '../../../../../../pages/api/platform/projects/[ref]'

vi.mock('@/lib/constants', () => ({
  IS_PLATFORM: false,
  API_URL: 'https://api.example.com',
}))

vi.mock('@/lib/constants/api', () => ({
  PROJECT_REST_URL: 'https://api.example.com/rest/v1',
}))

describe('/api/platform/projects/[ref]', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('deletes a self-hosted project through the management API bridge', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal/base?secret=yes')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_WRITE_TOKEN', 'write-token')
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'deleted',
          code: 'coolify_delete_queued',
          project: { ref: 'demo-project' },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )

    const { req, res } = createMocks({
      method: 'DELETE',
      query: { ref: 'demo-project' },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toEqual({ ref: 'demo-project' })
    expect(String(fetchMock.mock.calls[0][0])).toBe('http://management.internal/v1/projects/demo-project')
    expect(fetchMock.mock.calls[0][1]?.method).toBe('DELETE')
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: 'Bearer write-token',
    })
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      confirm: 'demo-project',
    })
  })

  it('returns a clear self-hosted bridge error when deletion is not configured', async () => {
    const { req, res } = createMocks({
      method: 'DELETE',
      query: { ref: 'demo-project' },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(503)
    expect(JSON.parse(res._getData()).error.message).toContain(
      'Self-hosted project deletion requires the management API write bridge'
    )
  })
})
