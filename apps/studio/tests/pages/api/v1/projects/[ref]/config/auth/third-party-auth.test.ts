import { createMocks } from 'node-mocks-http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import listHandler from '@/pages/api/v1/projects/[ref]/config/auth/third-party-auth'
import deleteHandler from '@/pages/api/v1/projects/[ref]/config/auth/third-party-auth/[tpa_id]'

vi.mock('@/lib/constants', () => ({
  IS_PLATFORM: false,
  API_URL: 'https://api.example.com',
}))

describe('/api/v1/projects/[ref]/config/auth/third-party-auth', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns an empty list when listing is not configured', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { ref: 'default' } })

    await listHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toEqual([])
  })

  it('falls back to an empty list when listing through the management API fails', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_TOKEN', 'read-token')
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'upstream unavailable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const { req, res } = createMocks({ method: 'GET', query: { ref: 'default' } })

    await listHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toEqual([])
  })

  it('lists integrations through the self-host management API', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_TOKEN', 'read-token')
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          integrations: [{ id: 'tpa_1', oidc_issuer_url: 'https://example.auth0.com/' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const { req, res } = createMocks({ method: 'GET', query: { ref: 'default' } })

    await listHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toEqual([
      { id: 'tpa_1', oidc_issuer_url: 'https://example.auth0.com/' },
    ])
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'http://management.internal/v1/projects/default/auth/third-party-auth'
    )
  })

  it('creates integrations with the management write contract', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_WRITE_TOKEN', 'write-token')
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'tpa_2' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const { req, res } = createMocks({
      method: 'POST',
      query: { ref: 'default' },
      body: { oidc_issuer_url: 'https://issuer.example.com' },
    })

    await listHandler(req, res)

    expect(res._getStatusCode()).toBe(201)
    const [, init] = fetchMock.mock.calls[0]
    expect(init?.method).toBe('POST')
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer write-token' })
    expect(init?.body).toBe(JSON.stringify({ oidc_issuer_url: 'https://issuer.example.com' }))
  })

  it('returns a generic unavailable error when creating without the management API', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: { ref: 'default' },
      body: { oidc_issuer_url: 'https://issuer.example.com' },
    })

    await listHandler(req, res)

    expect(res._getStatusCode()).toBe(503)
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Third-party auth integrations require a configured self-host management API',
    })
  })

  it('returns a generic error when creating fails through the management API', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_WRITE_TOKEN', 'write-token')
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'upstream secret detail' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const { req, res } = createMocks({
      method: 'POST',
      query: { ref: 'default' },
      body: { oidc_issuer_url: 'https://issuer.example.com' },
    })

    await listHandler(req, res)

    expect(res._getStatusCode()).toBe(500)
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Unable to create third-party auth integration',
    })
  })

  it('deletes integrations with the management write contract', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_WRITE_TOKEN', 'write-token')
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'tpa_1', deleted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const { req, res } = createMocks({
      method: 'DELETE',
      query: { ref: 'default', tpa_id: 'tpa_1' },
    })

    await deleteHandler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'http://management.internal/v1/projects/default/auth/third-party-auth/tpa_1'
    )
    expect(fetchMock.mock.calls[0][1]?.method).toBe('DELETE')
  })

  it('returns a generic error when deleting fails through the management API', async () => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_WRITE_TOKEN', 'write-token')
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'delete detail' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const { req, res } = createMocks({
      method: 'DELETE',
      query: { ref: 'default', tpa_id: 'tpa_1' },
    })

    await deleteHandler(req, res)

    expect(res._getStatusCode()).toBe(500)
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Unable to delete third-party auth integration',
    })
  })
})
