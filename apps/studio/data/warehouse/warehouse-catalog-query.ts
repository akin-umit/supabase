import { useQuery, type UseQueryOptions } from '@tanstack/react-query'

import { warehouseKeys } from './keys'
import { fetchGet } from '@/data/fetchers'
import { API_URL } from '@/lib/constants'
import { ResponseError } from '@/types'

export interface WarehouseCatalogCredentials {
  catalogUri: string
  accessToken: string
  warehouseId: string
}

export interface WarehouseCatalog {
  enabled: boolean
  credentials?: WarehouseCatalogCredentials
}

type WarehouseCatalogApiResponse = {
  enabled: boolean
  credentials?: {
    catalog_uri: string
    access_token: string
    warehouse_id: string
  }
}

export type WarehouseCatalogVariables = { projectRef?: string }
export type WarehouseCatalogData = WarehouseCatalog
export type WarehouseCatalogError = ResponseError

export async function getWarehouseCatalog(
  { projectRef }: WarehouseCatalogVariables,
  signal?: AbortSignal
): Promise<WarehouseCatalogData> {
  if (!projectRef) throw new Error('projectRef is required')

  const result = await fetchGet<WarehouseCatalogApiResponse>(
    `${API_URL}/platform/warehouse/${projectRef}/catalog`,
    { abortSignal: signal, credentials: 'include' }
  )
  if (result instanceof ResponseError) throw result

  return {
    enabled: result.enabled,
    credentials: result.credentials
      ? {
          catalogUri: result.credentials.catalog_uri,
          accessToken: result.credentials.access_token,
          warehouseId: result.credentials.warehouse_id,
        }
      : undefined,
  }
}

export const useWarehouseCatalogQuery = <TData = WarehouseCatalogData>(
  { projectRef }: WarehouseCatalogVariables,
  {
    enabled = true,
    ...options
  }: Omit<UseQueryOptions<WarehouseCatalogData, WarehouseCatalogError, TData>, 'queryKey'> = {}
) =>
  useQuery<WarehouseCatalogData, WarehouseCatalogError, TData>({
    queryKey: warehouseKeys.catalog(projectRef),
    queryFn: ({ signal }) => getWarehouseCatalog({ projectRef }, signal),
    enabled: enabled && typeof projectRef !== 'undefined',
    ...options,
  })
