import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import handler from '../../../../../../pages/api/platform/storage/[ref]/credentials'

vi.mock('@/lib/constants', () => ({
  IS_PLATFORM: false,
  API_URL: 'https://api.example.com',
}))

describe('/api/platform/storage/[ref]/credentials', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('creates S3 access keys through the self-host management API', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_WRITE_TOKEN', 'write-token')
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          key: {
            id: 'key-1',
            access_key: 'access-key-1',
            description: 'studio-key',
            created_at: '2026-08-11T00:00:00Z',
          },
          secret_access_key: 'secret-key-1',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )

    const { req, res } = createMocks({
      method: 'POST',
      query: { ref: 'default' },
      body: { description: 'Studio key' },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(201)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('http://management.internal/v1/projects/default/storage/s3-keys')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ name: 'studio-key' })
    expect(JSON.parse(res._getData())).toMatchObject({
      id: 'key-1',
      access_key: 'access-key-1',
      secret_key: 'secret-key-1',
    })
  })

  it('returns an exact operator-managed reason when the write bridge is absent', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: { ref: 'default' },
      body: { description: 'Studio key' },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(503)
    expect(JSON.parse(res._getData()).error.message).toContain(
      'self-host management API write bridge is not configured'
    )
  })
})
