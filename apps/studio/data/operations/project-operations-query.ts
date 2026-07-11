import { useQuery } from '@tanstack/react-query'

import { operationsKeys } from './keys'
import { handleError } from '@/data/fetchers'
import { useDeploymentMode } from '@/hooks/misc/useDeploymentMode'
import type { ProjectOperations } from '@/lib/api/self-hosted/project-operations'
import { API_URL } from '@/lib/constants'
import type { ResponseError, UseCustomQueryOptions } from '@/types'

export type ProjectOperationsVariables = { projectRef?: string }

export async function getProjectOperations(
  { projectRef }: ProjectOperationsVariables,
  signal?: AbortSignal
): Promise<ProjectOperations> {
  if (!projectRef) throw new Error('projectRef is required')

  const response = await fetch(
    `${API_URL}/platform/projects/${encodeURIComponent(projectRef)}/operations`,
    {
      headers: { Accept: 'application/json' },
      signal,
    }
  )
  const body = await response.json()

  if (!response.ok) handleError(body)
  return body
}

export type ProjectOperationsData = Awaited<ReturnType<typeof getProjectOperations>>
export type ProjectOperationsError = ResponseError

export const useProjectOperationsQuery = <TData = ProjectOperationsData>(
  { projectRef }: ProjectOperationsVariables,
  {
    enabled = true,
    ...options
  }: UseCustomQueryOptions<ProjectOperationsData, ProjectOperationsError, TData> = {}
) => {
  const { isSelfHosted } = useDeploymentMode()

  return useQuery<ProjectOperationsData, ProjectOperationsError, TData>({
    queryKey: operationsKeys.projectOperations(projectRef),
    queryFn: ({ signal }) => getProjectOperations({ projectRef }, signal),
    enabled: enabled && isSelfHosted && typeof projectRef !== 'undefined' && projectRef !== '_',
    ...options,
  })
}
