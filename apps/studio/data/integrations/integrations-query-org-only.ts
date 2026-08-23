import { useQuery } from '@tanstack/react-query'

import { Integration } from './integrations.types'
import { integrationKeys } from './keys'
import { get, handleError } from '@/data/fetchers'
import { IS_PLATFORM } from '@/lib/constants'
import type { ResponseError, UseCustomQueryOptions } from '@/types'

type IntegrationsVariables = {
  orgSlug?: string
}

export async function getIntegrations({ orgSlug }: IntegrationsVariables) {
  if (!orgSlug) throw new Error('orgSlug is required')
  if (!IS_PLATFORM) return []

  const { data, error } = await get('/platform/integrations/{slug}', {
    params: { path: { slug: orgSlug } },
  })
  if (error) handleError(error)
  return data as unknown as Integration[]
}

export type IntegrationsData = Awaited<ReturnType<typeof getIntegrations>>
export type ProjectIntegrationConnectionsData = Awaited<ReturnType<typeof getIntegrations>>
export type IntegrationsError = ResponseError

export const useOrgIntegrationsQuery = <TData = IntegrationsData>(
  { orgSlug }: IntegrationsVariables,
  {
    enabled = true,
    ...options
  }: UseCustomQueryOptions<IntegrationsData, IntegrationsError, TData> = {}
) =>
  useQuery<IntegrationsData, IntegrationsError, TData>({
    queryKey: integrationKeys.integrationsListWithOrg(orgSlug),
    queryFn: () => getIntegrations({ orgSlug }),
    enabled: enabled && IS_PLATFORM && typeof orgSlug !== 'undefined',
    staleTime: 30 * 60 * 1000,
    ...options,
  })
