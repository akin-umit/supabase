import { getMigrationsSql } from '@supabase/pg-meta'
import { useQuery } from '@tanstack/react-query'
import { IS_PLATFORM } from 'common'

import { databaseKeys } from './keys'
import { executeSql } from '@/data/sql/execute-sql-mutation'
import { PROJECT_STATUS } from '@/lib/constants'
import { ResponseError, UseCustomQueryOptions } from '@/types'

export type DatabaseMigration = {
  version: string
  name?: string
  statements?: string[]
}

export type MigrationsVariables = {
  projectRef?: string
  projectStatus?: string
  connectionString?: string | null
}

export async function getMigrations(
  { projectRef, connectionString }: MigrationsVariables,
  signal?: AbortSignal
) {
  if (!projectRef) throw new Error('Project ref is required')

  if (!IS_PLATFORM) {
    const response = await fetch(`/api/v1/projects/${encodeURIComponent(projectRef)}/database/migrations`, {
      headers: { Accept: 'application/json' },
      signal,
    })
    const payload = await response.json().catch(() => undefined)

    if (!response.ok) {
      throw new Error(
        payload?.formattedError ?? payload?.message ?? 'Unable to read migration history'
      )
    }

    return payload as DatabaseMigration[]
  }

  const sql = getMigrationsSql()

  try {
    const { result } = await executeSql(
      { projectRef, connectionString, sql, queryKey: ['migrations'] },
      signal
    )

    return result as DatabaseMigration[]
  } catch (error) {
    if (
      (error as ResponseError).message.includes(
        'relation "supabase_migrations.schema_migrations" does not exist'
      )
    ) {
      return []
    }

    throw error
  }
}

export type MigrationsData = Awaited<ReturnType<typeof getMigrations>>
export type MigrationsError = ResponseError

export const useMigrationsQuery = <TData = MigrationsData>(
  { projectRef, projectStatus, connectionString }: MigrationsVariables,
  { enabled = true, ...options }: UseCustomQueryOptions<MigrationsData, MigrationsError, TData> = {}
) =>
  useQuery<MigrationsData, MigrationsError, TData>({
    queryKey: databaseKeys.migrations(projectRef),
    queryFn: ({ signal }) => getMigrations({ projectRef, connectionString }, signal),
    enabled:
      enabled && typeof projectRef !== 'undefined' && projectStatus !== PROJECT_STATUS.COMING_UP,
    ...options,
  })
