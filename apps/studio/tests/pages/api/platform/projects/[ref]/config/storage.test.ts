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
    vi.stubEnv('FILE_SIZE_LIMIT', String(100 * 1024 * 1024))
    vi.stubEnv('ENABLE_IMAGE_TRANSFORMATION', 'false')
    vi.stubEnv('ENABLE_S3_PROTOCOL', 'true')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_WRITE_TOKEN', 'write-token')

    const { req, res } = createMocks({ method: 'GET', query: { ref: 'default' } })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    const data = JSON.parse(res._getData())
    expect(data.fileSizeLimit).toBe(100 * 1024 * 1024)
    expect(data.features.imageTransformation.enabled).toBe(false)
    expect(data.features.s3Protocol.enabled).toBe(true)
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

  it('returns the persisted storage config when the management API responds with runtime field names', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_WRITE_TOKEN', 'write-token')
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          config: {
            file_size_limit: 32 * 1024 * 1024,
            image_proxy_auto_webp: true,
            s3_protocol_enabled: false,
          },
          operation: { id: 'op-1', status: 'succeeded' },
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
    expect(JSON.parse(res._getData())).toMatchObject({
      fileSizeLimit: 32 * 1024 * 1024,
      features: {
        imageTransformation: { enabled: true },
        s3Protocol: { enabled: false },
      },
      external: { operation: { id: 'op-1', status: 'succeeded' } },
    })
  })

  it('does not report success when the storage runtime operation failed', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_WRITE_TOKEN', 'write-token')
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          config: { file_size_limit: 32 * 1024 * 1024 },
          operation: {
            id: 'op-1',
            status: 'failed',
            code: 'storage_config_apply_failed',
            message: 'Coolify rejected the storage env update',
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
      body: { fileSizeLimit: 25 * 1024 * 1024 },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(502)
    expect(JSON.parse(res._getData()).error).toMatchObject({
      message: 'Coolify rejected the storage env update',
      code: 'storage_config_apply_failed',
    })
  })

  it('falls back to the self-host runtime storage endpoint when the storage config route is unavailable', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_WRITE_TOKEN', 'write-token')
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'not_found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            projectRef: 'default',
            service: 'storage',
            applied: ['fileSizeLimit', 'imageProxyAutoWebp', 's3ProtocolEnabled'],
            restarted: true,
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
        fileSizeLimit: 64 * 1024 * 1024,
        features: {
          imageTransformation: { enabled: false },
          s3Protocol: { enabled: true },
        },
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'http://management.internal/v1/projects/default/storage/config'
    )
    expect(String(fetchMock.mock.calls[1][0])).toBe(
      'http://management.internal/v1/projects/default/runtime/storage'
    )
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      fileSizeLimit: 64 * 1024 * 1024,
      imageProxyAutoWebp: false,
      s3ProtocolEnabled: true,
    })
    const data = JSON.parse(res._getData())
    expect(data.fileSizeLimit).toBe(64 * 1024 * 1024)
    expect(data.features.imageTransformation.enabled).toBe(false)
    expect(data.external.operation).toMatchObject({
      projectRef: 'default',
      service: 'storage',
      restarted: true,
    })
  })

  it('returns an exact self-host write bridge reason when the write bridge is absent', async () => {
    const { req, res } = createMocks({
      method: 'PATCH',
      query: { ref: 'default' },
      body: { fileSizeLimit: 25 * 1024 * 1024 },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(503)
    expect(JSON.parse(res._getData()).error.message).toContain(
      'self-host management API write bridge'
    )
  })
})
