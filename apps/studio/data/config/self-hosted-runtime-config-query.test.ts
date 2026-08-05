import { describe, expect, it } from 'vitest'

import { isSelfHostedLoggingReady } from './self-hosted-runtime-config-query'
import type { RuntimeConfigStatus } from '@/lib/api/self-hosted/runtime-config'

const loggingRuntime = (
  overrides: Partial<Record<string, 'configured' | 'enabled' | 'disabled' | 'missing'>> = {}
): RuntimeConfigStatus => ({
  service: 'logging',
  status: 'configured',
  mode: 'read_only',
  generatedAt: '2026-08-05T00:00:00.000Z',
  settings: ['analyticsService', 'vectorAgent', 'logflareAccess', 'logflareEndpoint'].map(
    (name) => ({
      name,
      status: overrides[name] ?? 'configured',
      required: name === 'analyticsService',
      sources: [name],
      activeSource: name,
    })
  ),
})

describe('isSelfHostedLoggingReady', () => {
  it('requires Logflare, analytics, and Vector to be available', () => {
    expect(isSelfHostedLoggingReady(loggingRuntime())).toBe(true)
  })

  it.each(['analyticsService', 'vectorAgent', 'logflareAccess', 'logflareEndpoint'])(
    'returns false when %s is unavailable',
    (setting) => {
      expect(isSelfHostedLoggingReady(loggingRuntime({ [setting]: 'missing' }))).toBe(false)
    }
  )
})
