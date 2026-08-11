import { afterEach, describe, expect, it, vi } from 'vitest'

import { applySelfHostedMigration } from './SelfHostedMigrationApply'

describe('applySelfHostedMigration', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('posts SQL to the local self-hosted migrations endpoint', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify([{ version: '20260811030102' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await applySelfHostedMigration({
      projectRef: 'default',
      name: 'create_orders',
      sql: 'create table public.orders (id int)',
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/projects/default/database/migrations', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'create_orders',
        query: 'create table public.orders (id int)',
      }),
    })
  })

  it('surfaces formatted database errors', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ formattedError: 'syntax error at or near "table"' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await expect(
      applySelfHostedMigration({
        projectRef: 'default',
        name: 'bad_sql',
        sql: 'create table',
      })
    ).rejects.toThrow('syntax error at or near "table"')
  })
})
