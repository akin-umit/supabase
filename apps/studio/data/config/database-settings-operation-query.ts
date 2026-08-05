import { queryOptions } from '@tanstack/react-query'

import type { DatabaseSettingsOperation } from './postgres-config-mutation'

type DatabaseSettingsOperationVariables = {
  projectRef?: string
  operationId?: string
}

export async function getDatabaseSettingsOperation({
  projectRef,
  operationId,
}: DatabaseSettingsOperationVariables): Promise<DatabaseSettingsOperation> {
  if (!projectRef || !operationId) throw new Error('Operation reference is required')

  const response = await fetch(
    `/api/v1/projects/${encodeURIComponent(projectRef)}/operations/${encodeURIComponent(operationId)}`,
    { headers: { Accept: 'application/json' } }
  )

  if (!response.ok) throw new Error('Failed to retrieve database settings operation')

  const payload = (await response.json()) as DatabaseSettingsOperation
  if (
    payload.id !== operationId ||
    !['queued', 'accepted', 'running', 'succeeded', 'failed', 'cancelled'].includes(payload.status)
  ) {
    throw new Error('Invalid database settings operation response')
  }

  return payload
}

export const databaseSettingsOperationQueryOptions = (
  variables: DatabaseSettingsOperationVariables
) =>
  queryOptions({
    queryKey: ['database-settings-operation', variables.projectRef, variables.operationId],
    queryFn: () => getDatabaseSettingsOperation(variables),
    enabled: Boolean(variables.projectRef && variables.operationId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'queued' || status === 'accepted' || status === 'running' ? 1_000 : false
    },
  })
