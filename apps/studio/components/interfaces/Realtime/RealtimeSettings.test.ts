import { describe, expect, it } from 'vitest'

import type { SelfHostedRealtimeConfig } from '@/lib/api/self-hosted/realtime'

describe('RealtimeSettings self-hosted config', () => {
  it('uses an editable management API shape without fallback metadata', () => {
    const config: SelfHostedRealtimeConfig = {
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

    expect(config).not.toHaveProperty('read_only')
    expect(config).not.toHaveProperty('sources')
  })
})
