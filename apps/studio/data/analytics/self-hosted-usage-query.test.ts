import { describe, expect, it } from 'vitest'

import { mergeSelfHostedUsageRows } from './self-hosted-usage-query'

describe('mergeSelfHostedUsageRows', () => {
  it('groups raw service logs into sorted hourly usage buckets', () => {
    const result = mergeSelfHostedUsageRows([
      [
        'total_rest_requests',
        {
          result: [
            { id: 'rest-2', timestamp: '2026-07-12T10:45:00Z' },
            { id: 'rest-1', timestamp: '2026-07-12T09:05:00Z' },
          ],
        },
      ],
      [
        'total_auth_requests',
        { result: [{ id: 'auth-1', timestamp: '2026-07-12T10:15:00Z' }] },
      ],
      ['total_storage_requests', { result: [] }],
      ['total_realtime_requests', { result: [] }],
    ])

    expect(result).toEqual([
      {
        timestamp: '2026-07-12T09:00:00.000Z',
        total_rest_requests: 1,
        total_auth_requests: 0,
        total_storage_requests: 0,
        total_realtime_requests: 0,
      },
      {
        timestamp: '2026-07-12T10:00:00.000Z',
        total_rest_requests: 1,
        total_auth_requests: 1,
        total_storage_requests: 0,
        total_realtime_requests: 0,
      },
    ])
  })
})
