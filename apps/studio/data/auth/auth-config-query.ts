import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { authKeys } from './keys'
import { SELF_HOSTED_AUTH_CONFIG_FALLBACK } from './self-hosted-auth-config-fallback'
import type { components } from '@/data/api'
import { get, handleError } from '@/data/fetchers'
import { IS_PLATFORM } from '@/lib/constants'
import type { ResponseError, UseCustomQueryOptions } from '@/types'

export type AuthConfigVariables = {
  projectRef?: string
}

export type AuthConfigResponse = components['schemas']['GoTrueConfigResponse']

const SELF_HOSTED_AUTH_CONFIG_TIMEOUT_MS = 3500

function buildSelfHostedSignal(signal?: AbortSignal) {
  if (IS_PLATFORM || typeof AbortController === 'undefined') return signal

  const controller = new AbortController()
  const abort = () => controller.abort()
  const timeout = setTimeout(abort, SELF_HOSTED_AUTH_CONFIG_TIMEOUT_MS)

  if (signal?.aborted) controller.abort()
  signal?.addEventListener('abort', abort, { once: true })

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', abort)
    },
  }
}

export async function getProjectAuthConfig(
  { projectRef }: AuthConfigVariables,
  signal?: AbortSignal
) {
  if (!projectRef) throw new Error('projectRef is required')

  const selfHostedSignal = buildSelfHostedSignal(signal)
  const requestSignal =
    typeof selfHostedSignal === 'object' && 'signal' in selfHostedSignal
      ? selfHostedSignal.signal
      : selfHostedSignal

  try {
    const { data, error } = await get('/platform/auth/{ref}/config', {
      params: { path: { ref: projectRef } },
      signal: requestSignal,
    })

    if (error) handleError(error)
    return data ?? (!IS_PLATFORM ? SELF_HOSTED_AUTH_CONFIG_FALLBACK : data)
  } catch (error) {
    if (!IS_PLATFORM) return SELF_HOSTED_AUTH_CONFIG_FALLBACK
    throw error
  } finally {
    if (typeof selfHostedSignal === 'object' && 'cleanup' in selfHostedSignal) {
      selfHostedSignal.cleanup()
    }
  }
}

export type ProjectAuthConfigData = Awaited<ReturnType<typeof getProjectAuthConfig>>
export type ProjectAuthConfigError = ResponseError

export const useAuthConfigQuery = <TData = ProjectAuthConfigData>(
  { projectRef }: AuthConfigVariables,
  {
    enabled = true,
    ...options
  }: UseCustomQueryOptions<ProjectAuthConfigData, ProjectAuthConfigError, TData> = {}
) =>
  useQuery<ProjectAuthConfigData, ProjectAuthConfigError, TData>({
    queryKey: authKeys.authConfig(projectRef),
    queryFn: ({ signal }) => getProjectAuthConfig({ projectRef }, signal),
    enabled: enabled && typeof projectRef !== 'undefined' && projectRef !== '_',
    ...options,
  })

export const useAuthConfigPrefetch = ({ projectRef }: AuthConfigVariables) => {
  const client = useQueryClient()

  return useCallback(() => {
    if (projectRef) {
      client.prefetchQuery({
        queryKey: authKeys.authConfig(projectRef),
        queryFn: ({ signal }) => getProjectAuthConfig({ projectRef }, signal),
      })
    }
  }, [client, projectRef])
}
