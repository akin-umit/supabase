import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getRuntimeConfig, updateRuntimeConfig } from './runtime-config'

vi.mock('./util', () => ({ assertSelfHosted: vi.fn() }))

describe('api/self-hosted/runtime-config', () => {
  beforeEach(() => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal/base?secret=yes')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_TOKEN', 'read-server-secret')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_WRITE_TOKEN', 'write-server-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('requests a fixed project runtime config endpoint with the internal token', async () => {
    const payload = {
      service: 'realtime',
      status: 'configured',
      mode: 'read_only',
      generatedAt: '2026-07-26T00:00:00.000Z',
      settings: [
        {
          name: 'jwtSigningMaterial',
          status: 'configured',
          required: true,
          sources: ['JWT_SECRET'],
          activeSource: 'JWT_SECRET',
        },
      ],
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await expect(getRuntimeConfig('default', 'realtime')).resolves.toEqual(payload)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url.toString()).toBe('http://management.internal/v1/projects/default/runtime/realtime')
    expect(init).toMatchObject({
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: 'Bearer read-server-secret' },
    })
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('patches runtime config through the same server-side management API boundary', async () => {
    const payload = {
      service: 'storage',
      status: 'configured',
      mode: 'read_only',
      generatedAt: '2026-07-26T00:00:00.000Z',
      settings: [],
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await expect(
      updateRuntimeConfig('default', 'storage', { fileSizeLimit: 1048576 })
    ).resolves.toEqual(payload)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url.toString()).toBe('http://management.internal/v1/projects/default/runtime/storage')
    expect(init).toMatchObject({
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer write-server-secret',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileSizeLimit: 1048576 }),
    })
  })

  it('rejects missing management API configuration without making a request', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_TOKEN', '')
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await expect(getRuntimeConfig('default', 'auth')).rejects.toMatchObject({
      message: 'Runtime config management API is not configured',
      statusCode: 503,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('requires the write token for runtime config patches', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_WRITE_TOKEN', '')
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await expect(
      updateRuntimeConfig('default', 'auth', { disableSignup: true })
    ).rejects.toMatchObject({
      message: 'Runtime config management API is not configured',
      statusCode: 503,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects unsafe management API URLs', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'https://user:pass@example.com')
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await expect(getRuntimeConfig('default', 'logging')).rejects.toMatchObject({
      message: 'Runtime config management API is not configured',
      statusCode: 503,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects invalid project refs before making a request', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await expect(getRuntimeConfig('../secret', 'auth')).rejects.toMatchObject({
      message: 'Invalid project reference',
      statusCode: 400,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not expose upstream response bodies or credentials in errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('server-secret: database password leaked', { status: 500 })
    )

    await expect(getRuntimeConfig('default', 'auth')).rejects.toMatchObject({
      message: 'Runtime config management API request failed',
      statusCode: 502,
    })
  })

  it('maps missing runtime endpoints to an unavailable management API error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not found', { status: 404 }))

    await expect(getRuntimeConfig('default', 'logging')).rejects.toMatchObject({
      message: 'Runtime config management API request failed',
      statusCode: 503,
    })
  })

  it('rejects malformed upstream JSON responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not-json', { status: 200 }))

    await expect(getRuntimeConfig('default', 'auth')).rejects.toMatchObject({
      message: 'Runtime config management API response was invalid',
      statusCode: 502,
    })
  })
})
