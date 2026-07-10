import { useQuery } from '@tanstack/react-query'
import type { components } from 'api-types'

import { replicationKeys } from './keys'
import { get, handleError } from '@/data/fetchers'
import type { ResponseError, UseCustomQueryOptions } from '@/types'

type ReplicationPipelineByIdParams = { projectRef?: string; pipelineId?: number }

async function fetchReplicationPipelineById(
  { projectRef, pipelineId }: ReplicationPipelineByIdParams,
  signal?: AbortSignal
) {
  if (!projectRef) throw new Error('projectRef is required')
  if (!pipelineId) throw new Error('pipelineId is required')
  const { data, error } = await get('/platform/replication/{ref}/pipelines/{pipeline_id}', {
    params: { path: { ref: projectRef, pipeline_id: pipelineId } },
    signal,
  })
  if (error) {
    handleError(error)
  }

  return data
}

export type ReplicationPipelineByIdData = components['schemas']['ReplicationPipelineResponse']

export type ReplicationTableSyncCopyConfig = ReplicationPipelineByIdData['config']['table_sync_copy']

// A table referenced by `table_sync_copy`. `schema`/`name` are `null` when the
// table id no longer resolves to a table in the source database, for example
// because the table was dropped after being selected.
export type ReplicationConfiguredTable = Extract<
  ReplicationTableSyncCopyConfig,
  { type: 'include_tables' }
>['tables'][number]

export const useReplicationPipelineByIdQuery = <TData = ReplicationPipelineByIdData>(
  { projectRef, pipelineId }: ReplicationPipelineByIdParams,
  {
    enabled = true,
    ...options
  }: UseCustomQueryOptions<ReplicationPipelineByIdData, ResponseError, TData> = {}
) =>
  useQuery<ReplicationPipelineByIdData, ResponseError, TData>({
    queryKey: replicationKeys.pipelineById(projectRef, pipelineId),
    queryFn: ({ signal }) => fetchReplicationPipelineById({ projectRef, pipelineId }, signal),
    enabled: enabled && typeof projectRef !== 'undefined' && typeof pipelineId !== 'undefined',
    ...options,
  })
