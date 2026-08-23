import { describe, expect, it } from 'vitest'

import { logsAllEndpointUrl, shouldUseOtelLogsEndpoint } from './logs-endpoint'

describe('logs endpoint selection', () => {
  it('uses the OTEL endpoint for self-hosted deployments regardless of hosted rollout flags', () => {
    expect(shouldUseOtelLogsEndpoint({ isPlatform: false, flagEnabled: false })).toBe(true)
    expect(logsAllEndpointUrl(true)).toBe(
      '/platform/projects/{ref}/analytics/endpoints/logs.all.otel'
    )
  })

  it('keeps hosted platform rollout flag behavior unchanged', () => {
    expect(shouldUseOtelLogsEndpoint({ isPlatform: true, flagEnabled: false })).toBe(false)
    expect(shouldUseOtelLogsEndpoint({ isPlatform: true, flagEnabled: true })).toBe(true)
  })
})
