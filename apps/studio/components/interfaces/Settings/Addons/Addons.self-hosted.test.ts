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
      description: 'Runtime settings were reported by the self-host management API.',
    })
    expect(getSelfHostedServiceBadge(status('incomplete'))).toEqual({
      label: 'Needs config',
      variant: 'warning',
      description: 'Some runtime settings are missing and must be completed in this VPS runtime.',
    })
    expect(getSelfHostedServiceBadge(undefined)).toEqual({
      label: 'Unavailable',
      variant: 'default',
      description: 'Studio could not read this service status from the management API.',
    })
    expect(getSelfHostedServiceBadge(status('unavailable'))).toEqual({
      label: 'Unavailable',
      variant: 'default',
      description: 'The management API reported this service as unavailable.',
    })
  })
})
