import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./util', () => ({ assertSelfHosted: vi.fn() }))

const settings = {
  private_only: false,
  connection_pool: 5,
  max_concurrent_users: 200,
  max_events_per_second: 100,
  max_bytes_per_second: 100000,
  max_channels_per_client: 100,
  max_joins_per_second: 100,
  max_presence_events_per_second: 5,
  max_payload_size_in_kb: 100,
  suspend: false,
}

describe('api/self-hosted/realtime management API', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('reads settings only from the management API', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management-api:8080')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_TOKEN', 'read-token')
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ settings }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetch)

    const { getManagedRealtimeConfig } = await import('./realtime')
    await expect(getManagedRealtimeConfig('default')).resolves.toEqual(settings)
    expect(fetch).toHaveBeenCalledWith(
      new URL('http://management-api:8080/v1/projects/default/config/realtime'),
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('patches settings with the server-side write token', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management-api:8080')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_WRITE_TOKEN', 'write-token')
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ settings: { ...settings, max_concurrent_users: 400 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetch)

    const { updateManagedRealtimeConfig } = await import('./realtime')
    await updateManagedRealtimeConfig('default', { max_concurrent_users: 400 })
    expect(fetch).toHaveBeenCalledWith(
      new URL('http://management-api:8080/v1/projects/default/config/realtime'),
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({ Authorization: 'Bearer write-token' }),
      })
    )
  })
})
