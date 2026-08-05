import { useQuery } from '@tanstack/react-query'

import type {
  RuntimeConfigResource,
  RuntimeConfigStatus,
} from '@/lib/api/self-hosted/runtime-config'
import type { UseCustomQueryOptions } from '@/types'

export async function getSelfHostedRuntimeConfig(
  projectRef: string,
  resource: RuntimeConfigResource,
  signal?: AbortSignal
) {
  const response = await fetch(`/api/platform/projects/${projectRef}/runtime/${resource}`, {
    headers: { Accept: 'application/json' },
    signal,
  })

  if (!response.ok) throw new Error(`Failed to load ${resource} runtime config`)
  return (await response.json()) as RuntimeConfigStatus
}

export function isRuntimeSettingReady(
  runtime: RuntimeConfigStatus | undefined,
  settingName: string
) {
  const setting = runtime?.settings.find(({ name }) => name === settingName)
  return setting?.status === 'configured' || setting?.status === 'enabled'
}

export function isSelfHostedLoggingReady(runtime: RuntimeConfigStatus | undefined) {
  return (
    runtime?.status === 'configured' &&
    isRuntimeSettingReady(runtime, 'analyticsService') &&
    isRuntimeSettingReady(runtime, 'vectorAgent') &&
    isRuntimeSettingReady(runtime, 'logflareAccess') &&
    isRuntimeSettingReady(runtime, 'logflareEndpoint')
  )
}

export const useSelfHostedRuntimeConfigQuery = (
  projectRef: string | undefined,
  resource: RuntimeConfigResource,
  options: UseCustomQueryOptions<RuntimeConfigStatus, Error> = {}
) =>
  useQuery<RuntimeConfigStatus, Error>({
    queryKey: ['self-hosted', 'runtime', resource, projectRef],
    queryFn: ({ signal }) => getSelfHostedRuntimeConfig(projectRef!, resource, signal),
    enabled: typeof projectRef === 'string' && projectRef.length > 0,
    refetchOnWindowFocus: false,
    ...options,
  })
