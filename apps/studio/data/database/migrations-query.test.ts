import { HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getMigrations } from './migrations-query'
import { addAPIMock } from '@/tests/lib/msw'

const { mockIsPlatform, mockExecuteSql } = vi.hoisted(() => ({
  mockIsPlatform: { value: true },
  mockExecuteSql: vi.fn(),
}))

vi.mock('common', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('common')
  return {
    ...actual,
    get IS_PLATFORM() {
      return mockIsPlatform.value
    },
  }
})

vi.mock('@/data/sql/execute-sql-mutation', () => ({
  executeSql: mockExecuteSql,
}))

describe('getMigrations', () => {
  beforeEach(() => {
    mockIsPlatform.value = true
    mockExecuteSql.mockReset()
  })

  it('returns the list of migrations', async () => {
    mockExecuteSql.mockResolvedValue({
      result: [
        {
          version: '20240202000000',
          name: 'add_projects',
          statements: ['create table public.projects (id int)'],
        },
        { version: '20240101000000', name: 'create_users', statements: null },
      ],
    })

    const result = await getMigrations({ projectRef: 'default' })

    expect(result).toEqual([
      {
        version: '20240202000000',
        name: 'add_projects',
        statements: ['create table public.projects (id int)'],
      },
      { version: '20240101000000', name: 'create_users', statements: null },
    ])
  })

  it('treats a missing migrations table as an empty list instead of an error', async () => {
    // Safety net: the SQL itself is defensive (see @supabase/pg-meta getMigrationsSql),
    // but if the relation-missing error still surfaces it must not become a failed query
    // that 400s and retries on every project page load.
    mockExecuteSql.mockRejectedValue({
      message: 'relation "supabase_migrations.schema_migrations" does not exist',
    })

    const result = await getMigrations({ projectRef: 'default' })

    expect(result).toEqual([])
  })

  it('rethrows other errors', async () => {
    mockExecuteSql.mockRejectedValue({ message: 'permission denied' })

    await expect(getMigrations({ projectRef: 'default' })).rejects.toThrowError('permission denied')
  })

  it('uses the local self-hosted migrations endpoint outside the hosted platform', async () => {
    mockIsPlatform.value = false
    addAPIMock({
      method: 'get',
      path: '/v1/projects/:ref/database/migrations',
      response: () =>
        HttpResponse.json<Array<{ version: string; name?: string }>>([
          {
            version: '20260811010101',
            name: 'self_hosted_patch',
          },
        ]),
    })

    await expect(getMigrations({ projectRef: 'default' })).resolves.toEqual([
      {
        version: '20260811010101',
        name: 'self_hosted_patch',
      },
    ])
  })
})
