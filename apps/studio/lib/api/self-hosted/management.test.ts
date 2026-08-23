import { afterEach, describe, expect, it, vi } from 'vitest'

import { requestSelfHostedManagement, SelfHostedManagementError } from './management'

describe('self-hosted management client', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('keeps credentials server-side and forwards an allowlisted resource', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal/base?secret=yes')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_TOKEN', 'read-token')
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ backups: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await requestSelfHostedManagement({
      projectRef: 'default',
      resource: ['backups'],
      method: 'GET',
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('http://management.internal/v1/projects/default/backups')
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer read-token' })
    fetchMock.mockRestore()
  })

  it('rejects arbitrary proxy paths', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_TOKEN', 'read-token')
    await expect(
      requestSelfHostedManagement({
        projectRef: 'default',
        resource: ['admin', 'secrets'],
        method: 'GET',
      })
    ).rejects.toBeInstanceOf(SelfHostedManagementError)
  })

  it('allows runtime resources used by self-hosted settings panels', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_TOKEN', 'read-token')
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'configured' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await requestSelfHostedManagement({
      projectRef: 'default',
      resource: ['runtime', 'logging'],
      method: 'GET',
    })

    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('http://management.internal/v1/projects/default/runtime/logging')
    fetchMock.mockRestore()
  })

  it('surfaces nested backup runner errors without leaking arbitrary response bodies', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_WRITE_TOKEN', 'write-token')
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            message: 'upstream_operation_failed',
            detail: 'db password should not be surfaced',
          },
        }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )

    await expect(
      requestSelfHostedManagement({
        projectRef: 'default',
        resource: ['backups'],
        method: 'POST',
      })
    ).rejects.toMatchObject({
      message: 'upstream_operation_failed',
      statusCode: 502,
    })
  })
})
