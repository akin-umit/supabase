import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import handler from '../../../../../../pages/api/v1/projects/[ref]/secrets'
import { getFunctionSecretStore } from '@/lib/api/self-hosted/functions/secrets'
import {
  SecretStoreCapacityError,
  SecretStoreConflictError,
  SecretStoreDataError,
  SecretStoreValidationError,
} from '@/lib/api/self-hosted/functions/secrets/fileSystemStore'
import { mswServer } from '@/tests/lib/msw'

vi.mock('@/lib/constants', () => ({
  IS_PLATFORM: false,
  API_URL: 'https://api.example.com',
}))
vi.mock('@/lib/api/self-hosted/functions/secrets', () => ({
  getFunctionSecretStore: vi.fn(),
}))

const store = {
  list: vi.fn(),
  upsert: vi.fn(),
  delete: vi.fn(),
}

describe('/api/v1/projects/[ref]/secrets', () => {
  beforeEach(() => {
    mswServer.close()
    vi.resetAllMocks()
    vi.mocked(getFunctionSecretStore).mockReturnValue(store as never)
  })

  it('returns the redacted secret list', async () => {
    store.list.mockResolvedValue([
      { name: 'API_TOKEN', value: 'sha256-digest', updated_at: '2026-07-12T00:00:00.000Z' },
    ])
    const { req, res } = createMocks({ method: 'GET', query: { ref: 'default' } })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toEqual([
      { name: 'API_TOKEN', value: 'sha256-digest', updated_at: '2026-07-12T00:00:00.000Z' },
    ])
  })

  it('accepts the existing client POST body and returns 201', async () => {
    const body = [{ name: 'API_TOKEN', value: 'plaintext' }]
    const { req, res } = createMocks({ method: 'POST', query: { ref: 'default' }, body })

    await handler(req, res)

    expect(store.upsert).toHaveBeenCalledWith(body)
    expect(res._getStatusCode()).toBe(201)
    expect(res._getData()).not.toContain('plaintext')
  })

  it('accepts the existing client DELETE body and returns 200', async () => {
    const body = ['API_TOKEN']
    const { req, res } = createMocks({ method: 'DELETE', query: { ref: 'default' }, body })

    await handler(req, res)

    expect(store.delete).toHaveBeenCalledWith(body)
    expect(res._getStatusCode()).toBe(200)
  })

  it.each([
    [
      new SecretStoreValidationError('Secret name uses a reserved prefix'),
      400,
      'Secret name uses a reserved prefix',
    ],
    [new SecretStoreConflictError(), 409, 'The secret store is busy'],
    [new SecretStoreCapacityError(), 413, 'The secret store exceeds its capacity'],
    [new SecretStoreDataError(), 500, 'The secret store is unavailable'],
    [new Error('plaintext-secret'), 500, 'Secret operation failed'],
  ])('maps store errors without leaking plaintext', async (error, status, message) => {
    store.upsert.mockRejectedValue(error)
    const { req, res } = createMocks({
      method: 'POST',
      query: { ref: 'default' },
      body: [{ name: 'API_TOKEN', value: 'plaintext-secret' }],
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(status)
    expect(JSON.parse(res._getData())).toEqual({ error: { message } })
    expect(res._getData()).not.toContain('plaintext-secret')
  })

  it('returns 405 for unsupported methods', async () => {
    const { req, res } = createMocks({ method: 'PUT', query: { ref: 'default' } })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(405)
    expect(res.getHeader('Allow')).toEqual(['GET', 'POST', 'DELETE'])
  })
})
