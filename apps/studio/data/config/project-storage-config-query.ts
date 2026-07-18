import { useQuery } from '@tanstack/react-query'

import { configKeys } from './keys'
import { components } from '@/data/api'
import { get, handleError } from '@/data/fetchers'
import { useDeploymentMode } from '@/hooks/misc/useDeploymentMode'
import { IS_PLATFORM } from '@/lib/constants'
import type { ResponseError, UseCustomQueryOptions } from '@/types'

export type ProjectStorageConfigVariables = {
  projectRef?: string
}

export type ProjectStorageConfigResponse = components['schemas']['StorageConfigResponse']

export const SELF_HOSTED_STORAGE_CONFIG_FALLBACK = {
  capabilities: { iceberg_catalog: true, list_v2: true },
  databasePoolMode: 'transaction',
  external: { upstreamTarget: 'self-hosted' },
  features: {
    icebergCatalog: { enabled: true, maxCatalogs: 25, maxNamespaces: 250, maxTables: 2500 },
    imageTransformation: { enabled: true },
    s3Protocol: { enabled: true },
    vectorBuckets: { enabled: true, maxBuckets: 100, maxIndexes: 1000 },
  },
  fileSizeLimit: 0,
  migrationVersion: 'self-hosted',
} as unknown as ProjectStorageConfigResponse

export async function getProjectStorageConfig(
  { projectRef }: ProjectStorageConfigVariables,
  signal?: AbortSignal
) {
  if (!projectRef) throw new Error('projectRef is required')

  const { data, error } = await get('/platform/projects/{ref}/config/storage', {
    params: { path: { ref: projectRef } },
    signal,
  })

  if (error && !IS_PLATFORM) {
    return SELF_HOSTED_STORAGE_CONFIG_FALLBACK
  }

  if (error) {
    // [Joshen] This is due to API not returning an error message on this endpoint if a 404 is returned
    // Should only be a temporary patch, needs to be addressed on the API end
    if ((error as any).code === 404) {
      handleError({ ...(error as any), message: 'Storage configuration not found.' })
    } else {
      handleError(error)
    }
  }
  return data
}

export type ProjectStorageConfigData = Awaited<ReturnType<typeof getProjectStorageConfig>>
export type ProjectStorageConfigError = ResponseError

export const useProjectStorageConfigQuery = <TData = ProjectStorageConfigData>(
  { projectRef }: ProjectStorageConfigVariables,
  {
    enabled = true,
    ...options
  }: UseCustomQueryOptions<ProjectStorageConfigData, ProjectStorageConfigError, TData> = {}
) =>
  useQuery<ProjectStorageConfigData, ProjectStorageConfigError, TData>({
    queryKey: configKeys.storage(projectRef),
    queryFn: ({ signal }) => getProjectStorageConfig({ projectRef }, signal),
    enabled: enabled && typeof projectRef !== 'undefined' && projectRef !== '_',
    ...options,
  })

export const useIsAnalyticsBucketsEnabled = ({ projectRef }: { projectRef?: string }) => {
  const { data } = useProjectStorageConfigQuery({ projectRef })
  const isIcebergCatalogEnabled = !!data?.features.icebergCatalog?.enabled
  return isIcebergCatalogEnabled
}

export const useIsVectorBucketsEnabled = ({ projectRef }: { projectRef?: string }) => {
  const { data } = useProjectStorageConfigQuery({ projectRef })
  const { isCli, isPlatform } = useDeploymentMode()

  const isVectorBucketsEnabled = isCli || !isPlatform || !!data?.features.vectorBuckets?.enabled
  return isVectorBucketsEnabled
}
