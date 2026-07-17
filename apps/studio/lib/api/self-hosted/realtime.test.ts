import { afterEach, describe, expect, it, vi } from 'vitest'

describe('api/self-hosted/realtime', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('maps self-hosted realtime env vars into the Studio config shape', async () => {
    vi.stubEnv('STUDIO_PLATFORM', 'false')
    vi.stubEnv('REALTIME_ENABLED', 'false')
    vi.stubEnv('TENANT_PRIVATE_ONLY', 'true')
    vi.stubEnv('DB_POOL_SIZE', '12')
    vi.stubEnv('TENANT_MAX_CONCURRENT_USERS', '300')
    vi.stubEnv('TENANT_MAX_EVENTS_PER_SECOND', '250')
    vi.stubEnv('TENANT_MAX_BYTES_PER_SECOND', '123456')
    vi.stubEnv('TENANT_MAX_CHANNELS_PER_CLIENT', '42')
    vi.stubEnv('TENANT_MAX_JOINS_PER_SECOND', '21')
    vi.stubEnv('CLIENT_PRESENCE_MAX_CALLS', '8')
    vi.stubEnv('TENANT_MAX_PAYLOAD_SIZE_IN_KB', '256')

    const { getSelfHostedRealtimeConfig } = await import('./realtime')

    expect(getSelfHostedRealtimeConfig()).toMatchObject({
      suspend: true,
      private_only: true,
      connection_pool: 12,
      max_concurrent_users: 300,
      max_events_per_second: 250,
      max_bytes_per_second: 123456,
      max_channels_per_client: 42,
      max_joins_per_second: 21,
      max_presence_events_per_second: 8,
      max_payload_size_in_kb: 256,
      read_only: true,
      sources: {
        connection_pool: 'DB_POOL_SIZE',
        max_concurrent_users: 'TENANT_MAX_CONCURRENT_USERS',
      },
    })
  })

  it('falls back to upstream realtime defaults when env vars are absent', async () => {
    vi.stubEnv('STUDIO_PLATFORM', 'false')

    const { getSelfHostedRealtimeConfig } = await import('./realtime')

    expect(getSelfHostedRealtimeConfig()).toMatchObject({
      suspend: false,
      private_only: false,
      connection_pool: 5,
      max_concurrent_users: 200,
      max_events_per_second: 100,
      max_presence_events_per_second: 5,
      max_payload_size_in_kb: 100,
    })
  })
})
