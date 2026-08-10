import { queryOptions } from '@tanstack/react-query'

import type { DatabaseSettingsOperation } from './postgres-config-mutation'

type DatabaseSettingsOperationVariables = {
  projectRef?: string
  operationId?: string
}

function isDatabaseSettingsOperation(value: unknown): value is DatabaseSettingsOperation {
  if (!value || typeof value !== 'object') return false
  const operation = value as Partial<DatabaseSettingsOperation>
  return (
    typeof operation.id === 'string' &&
    ['queued', 'accepted', 'running', 'succeeded', 'failed', 'cancelled'].includes(
      operation.status ?? ''
    )
  )
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

  const payload = (await response.json()) as
    | DatabaseSettingsOperation
    | { operation?: DatabaseSettingsOperation }
  const operation = 'operation' in payload && payload.operation ? payload.operation : payload
  if (!isDatabaseSettingsOperation(operation) || operation.id !== operationId) {
    throw new Error('Invalid database settings operation response')
  }

  return operation
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
