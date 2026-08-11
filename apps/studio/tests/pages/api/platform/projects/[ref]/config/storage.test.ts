import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import handler from '../../../../../../../pages/api/platform/projects/[ref]/config/storage'

vi.mock('@/lib/constants', () => ({
  IS_PLATFORM: false,
  API_URL: 'https://api.example.com',
}))

describe('/api/platform/projects/[ref]/config/storage', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('returns self-host storage config with runtime bridge status', async () => {
    vi.stubEnv('STORAGE_FILE_SIZE_LIMIT', String(100 * 1024 * 1024))
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_WRITE_TOKEN', 'write-token')

    const { req, res } = createMocks({ method: 'GET', query: { ref: 'default' } })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.fileSizeLimit).toBe(100 * 1024 * 1024)
    expect(data.external.selfHosted.managementApi).toMatchObject({
      configured: true,
      writable: true,
    })
  })

  it('patches storage runtime config through the self-host management API', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal/base?secret=yes')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_WRITE_TOKEN', 'write-token')
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          fileSizeLimit: 25 * 1024 * 1024,
          features: {
            imageTransformation: { enabled: false },
            s3Protocol: { enabled: true },
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )

    const { req, res } = createMocks({
      method: 'PATCH',
      query: { ref: 'default' },
      body: {
        fileSizeLimit: 25 * 1024 * 1024,
        features: {
          imageTransformation: { enabled: false },
          s3Protocol: { enabled: true },
        },
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('http://management.internal/v1/projects/default/storage/config')
    expect(init?.method).toBe('PATCH')
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer write-token' })
    expect(JSON.parse(String(init?.body))).toEqual({
      fileSizeLimit: 25 * 1024 * 1024,
      features: {
        imageTransformation: { enabled: false },
        s3Protocol: { enabled: true },
      },
    })
    expect(JSON.parse(res._getData()).features.imageTransformation.enabled).toBe(false)
  })

  it('returns an exact operator-managed reason when the write bridge is absent', async () => {
    const { req, res } = createMocks({
      method: 'PATCH',
      query: { ref: 'default' },
      body: { fileSizeLimit: 25 * 1024 * 1024 },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(503)
    expect(JSON.parse(res._getData()).error.message).toContain(
      'self-host management API write bridge is not configured'
    )
  })
})
