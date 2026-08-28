import { afterEach, describe, expect, it, vi } from 'vitest'

import { listSelfHostedThirdPartyAuthIntegrations } from './third-party-auth'

vi.mock('./util', () => ({ assertSelfHosted: vi.fn() }))

describe('api/self-hosted/third-party-auth', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('surfaces missing management API configuration instead of returning a fake empty list', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await expect(listSelfHostedThirdPartyAuthIntegrations('default')).rejects.toMatchObject({
      message:
        'Third-party auth integrations require the self-host management API write bridge. Configure INTERNAL_MANAGEMENT_API_URL and INTERNAL_MANAGEMENT_API_WRITE_TOKEN so Studio can persist GOTRUE_* auth settings and apply the Auth service runtime.',
      statusCode: 503,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
