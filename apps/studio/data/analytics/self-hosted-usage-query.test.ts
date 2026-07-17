import { describe, expect, it } from 'vitest'

import {
  mergeSelfHostedUsageRows,
  SELF_HOSTED_USAGE_SERVICE_QUERIES,
} from './self-hosted-usage-query'

describe('mergeSelfHostedUsageRows', () => {
  it('groups raw service logs into sorted hourly usage buckets', () => {
    const result = mergeSelfHostedUsageRows([
      ['total_api_requests', { result: [{ id: 'gateway-1', timestamp: '2026-07-12T10:30:00Z' }] }],
      [
        'total_functions_requests',
        { result: [{ id: 'function-1', timestamp: '2026-07-12T10:35:00Z' }] },
      ],
      [
        'total_rest_requests',
        {
          result: [
            { id: 'rest-2', timestamp: '2026-07-12T10:45:00Z' },
            { id: 'rest-1', timestamp: '2026-07-12T09:05:00Z' },
          ],
        },
      ],
      ['total_auth_requests', { result: [{ id: 'auth-1', timestamp: '2026-07-12T10:15:00Z' }] }],
      ['total_storage_requests', { result: [] }],
      ['total_realtime_requests', { result: [] }],
    ])

    expect(result).toEqual([
      {
        timestamp: '2026-07-12T09:00:00.000Z',
        total_api_requests: 0,
        total_functions_requests: 0,
        total_rest_requests: 1,
        total_auth_requests: 0,
        total_storage_requests: 0,
        total_realtime_requests: 0,
      },
      {
        timestamp: '2026-07-12T10:00:00.000Z',
        total_api_requests: 1,
        total_functions_requests: 1,
        total_rest_requests: 1,
        total_auth_requests: 1,
        total_storage_requests: 0,
        total_realtime_requests: 0,
      },
    ])
  })
})

describe('SELF_HOSTED_USAGE_SERVICE_QUERIES', () => {
  it('splits API Gateway and PostgREST counts instead of double-counting edge logs', () => {
    expect(SELF_HOSTED_USAGE_SERVICE_QUERIES.total_api_requests).toContain('from edge_logs')
    expect(SELF_HOSTED_USAGE_SERVICE_QUERIES.total_api_requests).toContain(
      "request.path not like '/rest/v1%'"
    )

    expect(SELF_HOSTED_USAGE_SERVICE_QUERIES.total_rest_requests).toContain('from edge_logs')
    expect(SELF_HOSTED_USAGE_SERVICE_QUERIES.total_rest_requests).toContain(
      "request.path like '/rest/v1%'"
    )
  })
})
