import { assertSelfHosted } from './util'

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

const parseNumber = (value: string | undefined, fallback: number) => {
  if (value === undefined || value.trim().length === 0) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export type SelfHostedRealtimeConfig = {
  private_only: boolean
  connection_pool: number
  max_concurrent_users: number
  max_events_per_second: number
  max_bytes_per_second: number
  max_channels_per_client: number
  max_joins_per_second: number
  max_presence_events_per_second: number
  max_payload_size_in_kb: number
  suspend: boolean
  read_only: boolean
  sources: Record<string, string>
}

/**
 * Reads the values the self-hosted Realtime container is seeded with.
 *
 * These are operator-managed runtime defaults, not Cloud control-plane config.
 */
export function getSelfHostedRealtimeConfig(): SelfHostedRealtimeConfig {
  assertSelfHosted()

  const config = {
    private_only: parseBoolean(process.env.TENANT_PRIVATE_ONLY, false),
    connection_pool: parseNumber(process.env.DB_POOL_SIZE, 5),
    max_concurrent_users: parseNumber(process.env.TENANT_MAX_CONCURRENT_USERS, 200),
    max_events_per_second: parseNumber(process.env.TENANT_MAX_EVENTS_PER_SECOND, 100),
    max_bytes_per_second: parseNumber(process.env.TENANT_MAX_BYTES_PER_SECOND, 100000),
    max_channels_per_client: parseNumber(process.env.TENANT_MAX_CHANNELS_PER_CLIENT, 100),
    max_joins_per_second: parseNumber(process.env.TENANT_MAX_JOINS_PER_SECOND, 100),
    max_presence_events_per_second: parseNumber(process.env.CLIENT_PRESENCE_MAX_CALLS, 5),
    max_payload_size_in_kb: parseNumber(process.env.TENANT_MAX_PAYLOAD_SIZE_IN_KB, 100),
    suspend: !parseBoolean(process.env.REALTIME_ENABLED, true),
    read_only: true,
    sources: {
      suspend: 'REALTIME_ENABLED',
      private_only: 'TENANT_PRIVATE_ONLY',
      connection_pool: 'DB_POOL_SIZE',
      max_concurrent_users: 'TENANT_MAX_CONCURRENT_USERS',
      max_events_per_second: 'TENANT_MAX_EVENTS_PER_SECOND',
      max_bytes_per_second: 'TENANT_MAX_BYTES_PER_SECOND',
      max_channels_per_client: 'TENANT_MAX_CHANNELS_PER_CLIENT',
      max_joins_per_second: 'TENANT_MAX_JOINS_PER_SECOND',
      max_presence_events_per_second: 'CLIENT_PRESENCE_MAX_CALLS',
      max_payload_size_in_kb: 'TENANT_MAX_PAYLOAD_SIZE_IN_KB',
    },
  } satisfies SelfHostedRealtimeConfig

  return config
}
