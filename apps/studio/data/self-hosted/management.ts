import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type ManagementResource = string[]

async function managementRequest<T>({
  projectRef,
  resource,
  method = 'GET',
  body,
}: {
  projectRef: string
  resource: ManagementResource
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
}): Promise<T> {
  const response = await fetch(
    `/api/self-hosted/${encodeURIComponent(projectRef)}/${resource.map(encodeURIComponent).join('/')}`,
    {
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    }
  )
  const payload = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : (payload?.error?.message ?? payload?.message ?? 'Management operation failed')
    throw new Error(message)
  }
  return payload as T
}

export function useSelfHostedManagementQuery<T>({
  projectRef,
  resource,
  enabled = true,
}: {
  projectRef?: string
  resource: ManagementResource
  enabled?: boolean
}) {
  return useQuery<T, Error>({
    queryKey: ['self-hosted-management', projectRef, ...resource],
    queryFn: () => managementRequest<T>({ projectRef: projectRef!, resource }),
    enabled: enabled && !!projectRef,
  })
}

export function useSelfHostedManagementMutation<TData = unknown, TVariables = unknown>({
  projectRef,
  resource,
  method = 'POST',
}: {
  projectRef?: string
  resource: ManagementResource | ((variables: TVariables) => ManagementResource)
  method?: 'POST' | 'PATCH' | 'DELETE'
}) {
  const client = useQueryClient()
  return useMutation<TData, Error, TVariables>({
    mutationFn: (variables) => {
      if (!projectRef) throw new Error('Project ref is required')
      return managementRequest<TData>({
        projectRef,
        resource: typeof resource === 'function' ? resource(variables) : resource,
        method,
        body: variables,
      })
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['self-hosted-management', projectRef] }),
  })
}
