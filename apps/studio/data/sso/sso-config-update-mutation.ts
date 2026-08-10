import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { orgSSOKeys } from './keys'
import type { components } from '@/data/api'
import { handleError, put } from '@/data/fetchers'
import { IS_PLATFORM } from '@/lib/constants'
import type { ResponseError, UseCustomMutationOptions } from '@/types'

export type SSOConfigUpdateVariables = {
  slug: string
  config: Partial<components['schemas']['UpdateSSOProviderBody']>
}

export async function updateSSOConfig({ slug, config }: SSOConfigUpdateVariables) {
  if (!IS_PLATFORM) return config

  const { data, error } = await put('/platform/organizations/{slug}/sso', {
    params: { path: { slug } },
    body: config as components['schemas']['UpdateSSOProviderBody'],
  })

  if (error) handleError(error)
  return data
}

type SSOConfigUpdateData = Awaited<ReturnType<typeof updateSSOConfig>>

export const useSSOConfigUpdateMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<
  UseCustomMutationOptions<SSOConfigUpdateData, ResponseError, SSOConfigUpdateVariables>,
  'mutationFn'
> = {}) => {
  const queryClient = useQueryClient()

  return useMutation<SSOConfigUpdateData, ResponseError, SSOConfigUpdateVariables>({
    mutationFn: (vars) => updateSSOConfig(vars),
    async onSuccess(data, variables, context) {
      const { slug } = variables
      if (IS_PLATFORM) {
        await queryClient.invalidateQueries({ queryKey: orgSSOKeys.orgSSOConfig(slug) })
      } else {
        queryClient.setQueryData(orgSSOKeys.orgSSOConfig(slug), data)
      }
      await onSuccess?.(data, variables, context)
    },
    async onError(data, variables, context) {
      if (onError === undefined) {
        if (data.message === '') {
          toast.error(`Failed to update SSO configuration.`)
        } else {
          toast.error(`${data.message}`)
        }
      } else {
        onError(data, variables, context)
      }
    },
    ...options,
  })
}
