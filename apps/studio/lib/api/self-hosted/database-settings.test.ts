import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getDatabaseSettings,
  getDatabaseSettingsOperation,
  updateDatabaseSettings,
} from './database-settings'

vi.mock('./util', () => ({ assertSelfHosted: vi.fn() }))

describe('api/self-hosted/database-settings', () => {
  beforeEach(() => {
    vi.stubEnv('INTERNAL_MANAGEMENT_API_URL', 'http://management.internal/untrusted?secret=yes')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_TOKEN', 'read-server-secret')
    vi.stubEnv('INTERNAL_MANAGEMENT_API_WRITE_TOKEN', 'write-server-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('maps the allowlisted PostgreSQL settings into the existing Studio form shape', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        settings: [
          { name: 'log_connections', value: 'on', pendingRestart: false, secret: 'drop-me' },
          { name: 'log_disconnections', value: 'off', pendingRestart: false },
        ],
      })
    )

    await expect(getDatabaseSettings('default')).resolves.toEqual({
      settings: { log_connections: true, log_disconnections: false },
      settingsList: [
        { name: 'log_connections', value: 'on', pendingRestart: false },
        { name: 'log_disconnections', value: 'off', pendingRestart: false },
      ],
      operation: undefined,
    })
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: 'Bearer read-server-secret',
    })
  })

  it('uses only the write token, wraps settings and supplies idempotency for mutations', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        settings: [
          { name: 'log_connections', value: 'on', pendingRestart: false },
          { name: 'log_disconnections', value: 'on', pendingRestart: false },
        ],
        operation: { id: '123e4567-e89b-12d3-a456-426614174000', status: 'succeeded' },
      })
    )

    await updateDatabaseSettings('default', {
      log_connections: true,
      log_disconnections: true,
    })
    const [, init] = fetchMock.mock.calls[0]
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer write-server-secret',
      'Content-Type': 'application/json',
      'X-Management-Actor': 'studio-admin',
    })
    expect((init?.headers as Record<string, string>)['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/)
    expect(init?.body).toBe(
      JSON.stringify({ settings: { log_connections: true, log_disconnections: true } })
    )
  })

  it('unwraps operation status and never exposes upstream error bodies', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      Response.json({ operation: { id: '123e4567-e89b-12d3-a456-426614174000', status: 'succeeded' } })
    )
    await expect(
      getDatabaseSettingsOperation('default', '123e4567-e89b-12d3-a456-426614174000')
    ).resolves.toMatchObject({ status: 'succeeded' })

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('write-server-secret database password', { status: 500 })
    )
    await expect(getDatabaseSettings('default')).rejects.toThrow(
      'Database settings management API request failed'
    )
  })
})
