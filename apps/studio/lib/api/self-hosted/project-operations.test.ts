import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getProjectOperations } from './project-operations'

vi.mock('./util', () => ({ assertSelfHosted: vi.fn() }))

describe('api/self-hosted/project-operations', () => {
  beforeEach(() => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal/untrusted?secret=yes')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_TOKEN', 'server-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('requests the fixed overview endpoint and normalizes an allowlisted response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          generatedAt: '2026-07-12T10:00:00Z',
          status: 'healthy',
          services: { postgres: 'healthy', storage: 'unavailable' },
          deployment: { commit: 'a1b2c3d', version: '1.2.3', secret: 'drop-me' },
          backup: { status: 'verified', lastVerifiedAt: '2026-07-12T09:00:00Z' },
          migration: {
            status: 'applied',
            lastApplied: '20260712090000_add_table',
            appliedAt: '2026-07-12T09:01:00Z',
          },
          ignored: 'value',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    await expect(getProjectOperations()).resolves.toEqual({
      generatedAt: '2026-07-12T10:00:00Z',
      status: 'healthy',
      services: { postgres: 'healthy', storage: 'unavailable' },
      deployment: { commit: 'a1b2c3d', version: '1.2.3' },
      backup: { status: 'verified', lastVerifiedAt: '2026-07-12T09:00:00Z' },
      migration: {
        status: 'applied',
        lastApplied: '20260712090000_add_table',
        appliedAt: '2026-07-12T09:01:00Z',
      },
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url.toString()).toBe('http://management.internal/v1/overview')
    expect(init).toMatchObject({
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: 'Bearer server-secret' },
    })
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('rejects missing server-side configuration without making a request', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_TOKEN', '')
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await expect(getProjectOperations()).rejects.toThrow('Project operations are not configured')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects unsafe management API URLs', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'file:///etc/passwd')
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await expect(getProjectOperations()).rejects.toThrow('Project operations are not configured')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not expose upstream response bodies or credentials in errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('server-secret: database password leaked', { status: 500 })
    )

    await expect(getProjectOperations()).rejects.toThrow('Project operations request failed')
  })

  it('rejects malformed upstream responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          generatedAt: 'not-a-date',
          status: 'healthy',
          services: {},
          deployment: { commit: 'not-a-sha', version: '1.2.3' },
          backup: { status: 'verified' },
          migration: { status: 'applied' },
        }),
        { status: 200 }
      )
    )

    await expect(getProjectOperations()).rejects.toThrow('Project operations response was invalid')
  })
})
