import { randomUUID } from 'crypto'

import { assertSelfHosted } from './util'

const REQUEST_TIMEOUT_MS = 10_000
const PROJECT_REF_PATTERN = /^[A-Za-z0-9_-]{1,64}$/

export type SelfHostedRealtimeConfig = {
  private_only: boolean
  connection_pool: number
  max_concurrent_users: number
  max_events_per_second: number
  max_bytes_per_second: number
  max_channels_per_client: number
  max_joins_per_second: number
  max_presence_events_per_second: number
  max_payload_size_in_kb: number
  suspend: boolean
}

type RealtimeManagementResponse = {
  settings?: Partial<SelfHostedRealtimeConfig>
}

export class RealtimeManagementApiError extends Error {
  constructor(
    message: string,
    public statusCode = 500
  ) {
    super(message)
    this.name = 'RealtimeManagementApiError'
  }
}

function managementUrl(projectRef: string) {
  if (!PROJECT_REF_PATTERN.test(projectRef)) {
    throw new RealtimeManagementApiError('Invalid project reference', 400)
  }

  const baseUrl = process.env.INTERNAL_MANAGEMENT_API_URL
  if (!baseUrl) {
    throw new RealtimeManagementApiError('Realtime management API is not configured', 503)
  }

  let url: URL
  try {
    url = new URL(baseUrl)
  } catch {
    throw new RealtimeManagementApiError('Realtime management API is not configured', 503)
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new RealtimeManagementApiError('Realtime management API is not configured', 503)
  }

  url.pathname = `/v1/projects/${encodeURIComponent(projectRef)}/config/realtime`
  url.search = ''
  url.hash = ''
  return url
}

function validateManagementSettings(payload: RealtimeManagementResponse) {
  const settings = payload.settings
  if (!settings || typeof settings !== 'object') {
    throw new RealtimeManagementApiError('Realtime management API response was invalid', 502)
  }

  const requiredNumbers = [
    'connection_pool',
    'max_concurrent_users',
    'max_events_per_second',
    'max_presence_events_per_second',
    'max_payload_size_in_kb',
  ] as const
  if (
    typeof settings.suspend !== 'boolean' ||
    typeof settings.private_only !== 'boolean' ||
    requiredNumbers.some((key) => !Number.isFinite(settings[key]))
  ) {
    throw new RealtimeManagementApiError('Realtime management API response was invalid', 502)
  }

  return settings as SelfHostedRealtimeConfig
}

async function requestManagedRealtimeConfig(
  projectRef: string,
  method: 'GET' | 'PATCH',
  body?: Record<string, boolean | number>
): Promise<SelfHostedRealtimeConfig> {
  assertSelfHosted()
  const readToken = process.env.INTERNAL_MANAGEMENT_API_TOKEN
  const writeToken = process.env.INTERNAL_MANAGEMENT_API_WRITE_TOKEN
  const token = method === 'PATCH' ? writeToken : readToken || writeToken
  if (!token) {
    throw new RealtimeManagementApiError('Realtime management API is not configured', 503)
  }

  try {
    const response = await fetch(managementUrl(projectRef), {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(method === 'PATCH'
          ? {
              'Content-Type': 'application/json',
              'Idempotency-Key': `studio-realtime-${randomUUID()}`,
              'X-Management-Actor': 'studio-admin',
            }
          : {}),
      },
      body: method === 'PATCH' ? JSON.stringify(body ?? {}) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new RealtimeManagementApiError(
        response.status === 404 || response.status === 405
          ? 'Realtime management API is not configured'
          : 'Realtime settings could not be applied',
        response.status === 404 || response.status === 405 ? 503 : 502
      )
    }

    const settings = validateManagementSettings((await response.json()) as RealtimeManagementResponse)
    return settings
  } catch (error) {
    if (error instanceof RealtimeManagementApiError) throw error
    throw new RealtimeManagementApiError('Unable to reach realtime management API', 502)
  }
}

export function getManagedRealtimeConfig(projectRef: string) {
  return requestManagedRealtimeConfig(projectRef, 'GET')
}

export function updateManagedRealtimeConfig(
  projectRef: string,
  body: Record<string, boolean | number>
) {
  return requestManagedRealtimeConfig(projectRef, 'PATCH', body)
}
