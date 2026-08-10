import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createSelfHostedStandbyKey,
  listSelfHostedSigningKeys,
  revokeSelfHostedSigningKey,
  updateSelfHostedSigningKey,
} from './jwt-signing-keys'

vi.mock('./util', () => ({ assertSelfHosted: vi.fn() }))

const firstKey = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  kid: '123e4567-e89b-12d3-a456-426614174000',
  algorithm: 'ES256',
  status: 'active',
  publicJwk: { kty: 'EC', crv: 'P-256', x: 'public-x', y: 'public-y' },
  createdAt: '2026-08-05T12:00:00.000Z',
  updatedAt: '2026-08-05T12:00:00.000Z',
}

describe('api/self-hosted/jwt-signing-keys', () => {
  beforeEach(() => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal/base?secret=yes')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_TOKEN', 'read-server-secret')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_WRITE_TOKEN', 'write-server-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('lists keys with the read token and maps management statuses to Studio', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ keys: [firstKey] }))

    await expect(listSelfHostedSigningKeys('default')).resolves.toEqual({
      keys: [
        expect.objectContaining({
          id: firstKey.id,
          algorithm: 'ES256',
          status: 'in_use',
          public_jwk: firstKey.publicJwk,
        }),
      ],
    })

    expect(fetchMock.mock.calls[0][0].toString()).toBe(
      'http://management.internal/v1/projects/default/auth/jwt-keys'
    )
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: 'Bearer read-server-secret',
    })
  })

  it('keeps current keys visible when management uses alternate list and timestamp shapes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        data: [
          {
            id: 'current-key',
            algorithm: 'ES256',
            status: 'current',
            public_jwk: { kty: 'EC' },
          },
          {
            id: 'previous-key',
            algorithm: 'ES256',
            status: 'previous',
            created_at: '2026-08-05T12:00:00.000Z',
            updated_at: '2026-08-05T12:00:00.000Z',
          },
        ],
      })
    )

    await expect(listSelfHostedSigningKeys('default')).resolves.toEqual({
      keys: [
        expect.objectContaining({
          id: 'current-key',
          status: 'in_use',
          created_at: expect.any(String),
        }),
        expect.objectContaining({
          id: 'previous-key',
          status: 'previously_used',
        }),
      ],
    })
  })

  it('creates a server-generated standby key with write-only authorization and idempotency', async () => {
    const standby = { ...firstKey, status: 'standby' }
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ key: standby }))

    await expect(createSelfHostedStandbyKey('default')).resolves.toMatchObject({
      id: standby.id,
      status: 'standby',
      algorithm: 'ES256',
    })

    const [, init] = fetchMock.mock.calls[0]
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer write-server-secret',
      'X-Management-Actor': 'studio-admin',
    })
    expect((init?.headers as Record<string, string>)['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/)
    expect(init?.body).toBeUndefined()
  })

  it('switches only a standby key and revokes only through the management API', async () => {
    const standby = { ...firstKey, status: 'standby' }
    const previous = { ...firstKey, status: 'previous' }
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ key: firstKey }))
      .mockResolvedValueOnce(Response.json({ key: previous }))

    await expect(
      updateSelfHostedSigningKey('default', firstKey.id, 'in_use')
    ).resolves.toMatchObject({ status: 'in_use' })
    await expect(revokeSelfHostedSigningKey('default', firstKey.id)).resolves.toMatchObject({
      status: 'revoked',
    })

    expect(fetchMock.mock.calls[0][0].toString()).toContain(`/jwt-keys/${firstKey.id}/switch`)
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST')
    expect(fetchMock.mock.calls[1][1]?.method).toBe('DELETE')
    expect(standby.status).toBe('standby')
  })

  it('rejects unsupported transitions and never exposes upstream response bodies', async () => {
    await expect(
      updateSelfHostedSigningKey('default', firstKey.id, 'previously_used')
    ).rejects.toMatchObject({ statusCode: 409 })

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('write-server-secret private key material', { status: 500 })
    )
    await expect(createSelfHostedStandbyKey('default')).rejects.toThrow(
      'JWT signing key operation failed'
    )
  })
})
