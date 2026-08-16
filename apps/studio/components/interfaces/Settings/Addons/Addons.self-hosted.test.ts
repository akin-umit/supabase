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
      label: 'Runtime ready',
      variant: 'success',
      description: 'The self-host runtime reported the required configuration for this service.',
    })
    expect(getSelfHostedServiceBadge(status('incomplete'))).toEqual({
      label: 'Configure',
      variant: 'warning',
      description:
        'Some VPS runtime variables are missing. Complete them in docker-compose.yml or .env.',
    })
    expect(getSelfHostedServiceBadge(undefined)).toEqual({
      label: 'Not reported',
      variant: 'default',
      description:
        'This VPS has not reported service evidence yet. Check the management API bridge and .env values.',
    })
    expect(getSelfHostedServiceBadge(status('unavailable'))).toEqual({
      label: 'Not running',
      variant: 'default',
      description: 'The management API can be reached, but this service is not reported as running.',
    })
  })
})
