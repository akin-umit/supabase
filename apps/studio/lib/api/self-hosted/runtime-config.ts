import { z } from 'zod'

import { assertSelfHosted } from './util'

const REQUEST_TIMEOUT_MS = 5_000

const projectRefSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/)
export const runtimeConfigResourceSchema = z.enum(['realtime', 'storage', 'auth', 'logging'])

const runtimeConfigStatusSchema = z
  .object({
    service: runtimeConfigResourceSchema,
    status: z.enum(['configured', 'incomplete', 'unavailable']),
    mode: z.literal('read_only'),
    generatedAt: z.string(),
    settings: z.array(
      z.object({
        name: z.string(),
        status: z.enum(['configured', 'enabled', 'disabled', 'missing']),
        required: z.boolean(),
        sources: z.array(z.string()),
        activeSource: z.string().optional(),
      })
    ),
  })
  .passthrough()

const runtimeConfigResponseSchemas = {
  realtime: runtimeConfigStatusSchema,
  storage: runtimeConfigStatusSchema,
  auth: runtimeConfigStatusSchema,
  logging: runtimeConfigStatusSchema,
} satisfies Record<RuntimeConfigResource, z.ZodType>

export type RuntimeConfigResource = z.infer<typeof runtimeConfigResourceSchema>
export type RuntimeConfigStatus = z.infer<typeof runtimeConfigStatusSchema>

export type RuntimeConfigByResource = {
  realtime: RuntimeConfigStatus
  storage: RuntimeConfigStatus
  auth: RuntimeConfigStatus
  logging: RuntimeConfigStatus
}

export class RuntimeManagementApiError extends Error {
  constructor(
    message: string,
    public statusCode = 500
  ) {
    super(message)
    this.name = 'RuntimeManagementApiError'
  }
}

function getRuntimeConfigUrl(baseUrl: string, projectRef: string, resource: RuntimeConfigResource) {
  const ref = projectRefSchema.safeParse(projectRef)
  if (!ref.success) {
    throw new RuntimeManagementApiError('Invalid project reference', 400)
  }

  let url: URL
  try {
    url = new URL(baseUrl)
  } catch {
    throw new RuntimeManagementApiError('Runtime config management API is not configured', 503)
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new RuntimeManagementApiError('Runtime config management API is not configured', 503)
  }

  url.pathname = `/v1/projects/${encodeURIComponent(ref.data)}/runtime/${resource}`
  url.search = ''
  url.hash = ''
  return url
}

async function readRuntimeResponse<TResource extends RuntimeConfigResource>(
  response: Response,
  resource: TResource
): Promise<RuntimeConfigByResource[TResource]> {
  if (!response.ok) {
    const statusCode = response.status === 404 || response.status === 405 ? 503 : 502
    throw new RuntimeManagementApiError('Runtime config management API request failed', statusCode)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new RuntimeManagementApiError('Runtime config management API response was invalid', 502)
  }

  const schema = runtimeConfigResponseSchemas[resource]
  const result = schema.safeParse(payload)
  if (!result.success) {
    throw new RuntimeManagementApiError('Runtime config management API response was invalid', 502)
  }

  return result.data as RuntimeConfigByResource[TResource]
}

async function requestRuntimeConfig<TResource extends RuntimeConfigResource>({
  method,
  projectRef,
  resource,
  body,
}: {
  method: 'GET' | 'PATCH'
  projectRef: string
  resource: TResource
  body?: unknown
}): Promise<RuntimeConfigByResource[TResource]> {
  assertSelfHosted()

  const baseUrl = process.env.INTERNAL_MANAGEMENT_API_URL
  const token =
    method === 'PATCH'
      ? process.env.INTERNAL_MANAGEMENT_API_WRITE_TOKEN
      : (process.env.INTERNAL_MANAGEMENT_API_TOKEN ??
        process.env.INTERNAL_MANAGEMENT_API_WRITE_TOKEN)

  if (!baseUrl || !token) {
    throw new RuntimeManagementApiError('Runtime config management API is not configured', 503)
  }

  const url = getRuntimeConfigUrl(baseUrl, projectRef, resource)
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }

  if (method === 'PATCH') {
    headers['Content-Type'] = 'application/json'
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: method === 'PATCH' ? JSON.stringify(body ?? {}) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    return await readRuntimeResponse(response, resource)
  } catch (error) {
    if (error instanceof RuntimeManagementApiError) {
      throw error
    }

    throw new RuntimeManagementApiError('Unable to reach runtime config management API', 502)
  }
}

export function getRuntimeConfig<TResource extends RuntimeConfigResource>(
  projectRef: string,
  resource: TResource
) {
  return requestRuntimeConfig({ method: 'GET', projectRef, resource })
}

export function updateRuntimeConfig<TResource extends RuntimeConfigResource>(
  projectRef: string,
  resource: TResource,
  body: unknown
) {
  return requestRuntimeConfig({ method: 'PATCH', projectRef, resource, body })
}
