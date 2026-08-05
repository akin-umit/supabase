import { describe, expect, it } from 'vitest'

import { getSelfHostedServiceBadge } from './Addons'
import type { RuntimeConfigStatus } from '@/lib/api/self-hosted/runtime-config'

const status = (value: RuntimeConfigStatus['status']): RuntimeConfigStatus => ({
  service: 'auth',
  status: value,
  mode: 'read_only',
  generatedAt: '2026-08-05T00:00:00.000Z',
  settings: [],
})

describe('getSelfHostedServiceBadge', () => {
  it('reports only the status returned by the management API', () => {
    expect(getSelfHostedServiceBadge(status('configured'))).toEqual({
      label: 'Configured',
      variant: 'success',
    })
    expect(getSelfHostedServiceBadge(status('incomplete'))).toEqual({
      label: 'Needs config',
      variant: 'warning',
    })
    expect(getSelfHostedServiceBadge(undefined)).toEqual({
      label: 'Unavailable',
      variant: 'default',
    })
  })
})
