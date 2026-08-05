import { createMocks } from 'node-mocks-http'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import handler from '../../../../../../../../pages/api/v1/projects/[ref]/config/database/postgres'
import {
  getDatabaseSettings,
  updateDatabaseSettings,
} from '@/lib/api/self-hosted/database-settings'
import { mswServer } from '@/tests/lib/msw'

vi.mock('@/lib/constants', () => ({ IS_PLATFORM: false }))
vi.mock('@/lib/api/self-hosted/database-settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/self-hosted/database-settings')>()
  return {
    ...actual,
    getDatabaseSettings: vi.fn(),
    updateDatabaseSettings: vi.fn(),
  }
})

describe('/api/v1/projects/[ref]/config/database/postgres', () => {
  beforeEach(() => {
    mswServer.close()
    vi.resetAllMocks()
  })

  it('returns the official flat Postgres config shape', async () => {
    vi.mocked(getDatabaseSettings).mockResolvedValue({
      settings: { log_connections: true, log_disconnections: false },
    })
    const { req, res } = createMocks({ method: 'GET', query: { ref: 'default' } })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toEqual({
      log_connections: true,
      log_disconnections: false,
    })
  })

  it('translates the existing Studio PUT request to the management update helper', async () => {
    const body = { log_connections: false, log_disconnections: true }
    vi.mocked(updateDatabaseSettings).mockResolvedValue({
      settings: body,
      operation: { id: 'op_123', status: 'queued' },
    })
    const { req, res } = createMocks({ method: 'PUT', query: { ref: 'default' }, body })

    await handler(req, res)

    expect(updateDatabaseSettings).toHaveBeenCalledWith('default', body)
    expect(JSON.parse(res._getData())).toEqual({
      ...body,
      operation: { id: 'op_123', status: 'queued' },
    })
  })

  it('rejects invalid project references', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { ref: '../secret' } })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    expect(getDatabaseSettings).not.toHaveBeenCalled()
  })
})
