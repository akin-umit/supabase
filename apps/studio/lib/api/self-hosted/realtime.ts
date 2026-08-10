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
  job?: {
    id?: string
    status?: string
    code?: string
  }
  operation?: {
    id?: string
    status?: string
    code?: string
  }
  error?: string
  message?: string
}

const DEFAULT_SELF_HOSTED_REALTIME_CONFIG: SelfHostedRealtimeConfig = {
  private_only: false,
  connection_pool: 5,
  max_concurrent_users: 200,
  max_events_per_second: 100,
  max_bytes_per_second: 1_000_000,
  max_channels_per_client: 100,
  max_joins_per_second: 100,
  max_presence_events_per_second: 5,
  max_payload_size_in_kb: 100,
  suspend: false,
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

function readBoolean(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'on', 'yes'].includes(normalized)) return true
    if (['false', '0', 'off', 'no'].includes(normalized)) return false
  }
  return fallback
}

function readNumber(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : fallback
}

function isRealtimeConfigPayload(payload: unknown): payload is Partial<SelfHostedRealtimeConfig> {
  return (
    !!payload &&
    typeof payload === 'object' &&
    ('suspend' in payload ||
      'private_only' in payload ||
      'connection_pool' in payload ||
      'max_concurrent_users' in payload)
  )
}

function validateManagementSettings(
  payload: RealtimeManagementResponse | Partial<SelfHostedRealtimeConfig>
) {
  const settings: Partial<SelfHostedRealtimeConfig> =
    'settings' in payload ? (payload.settings ?? {}) : (payload as Partial<SelfHostedRealtimeConfig>)
  if (!settings || typeof settings !== 'object') {
    throw new RealtimeManagementApiError('Realtime management API response was invalid', 502)
  }

  return {
    suspend: readBoolean(settings.suspend, DEFAULT_SELF_HOSTED_REALTIME_CONFIG.suspend),
    private_only: readBoolean(
      settings.private_only,
      DEFAULT_SELF_HOSTED_REALTIME_CONFIG.private_only
    ),
    connection_pool: readNumber(
      settings.connection_pool,
      DEFAULT_SELF_HOSTED_REALTIME_CONFIG.connection_pool
    ),
    max_concurrent_users: readNumber(
      settings.max_concurrent_users,
      DEFAULT_SELF_HOSTED_REALTIME_CONFIG.max_concurrent_users
    ),
    max_events_per_second: readNumber(
      settings.max_events_per_second,
      DEFAULT_SELF_HOSTED_REALTIME_CONFIG.max_events_per_second
    ),
    max_bytes_per_second: readNumber(
      settings.max_bytes_per_second,
      DEFAULT_SELF_HOSTED_REALTIME_CONFIG.max_bytes_per_second
    ),
    max_channels_per_client: readNumber(
      settings.max_channels_per_client,
      DEFAULT_SELF_HOSTED_REALTIME_CONFIG.max_channels_per_client
    ),
    max_joins_per_second: readNumber(
      settings.max_joins_per_second,
      DEFAULT_SELF_HOSTED_REALTIME_CONFIG.max_joins_per_second
    ),
    max_presence_events_per_second: readNumber(
      settings.max_presence_events_per_second,
      DEFAULT_SELF_HOSTED_REALTIME_CONFIG.max_presence_events_per_second
    ),
    max_payload_size_in_kb: readNumber(
      settings.max_payload_size_in_kb,
      DEFAULT_SELF_HOSTED_REALTIME_CONFIG.max_payload_size_in_kb
    ),
  }
}

async function readManagementError(response: Response) {
  let payload: RealtimeManagementResponse | undefined

  try {
    payload = (await response.json()) as RealtimeManagementResponse
  } catch {
    payload = undefined
  }

  const code = payload?.error
  if (response.status === 404 || response.status === 405) {
    return new RealtimeManagementApiError('Realtime management API is not configured', 503)
  }
  if (response.status === 503 && code === 'realtime_admin_not_configured') {
    return new RealtimeManagementApiError('Realtime admin API is not configured', 503)
  }

  return new RealtimeManagementApiError(
    payload?.message ?? 'Realtime settings could not be applied',
    response.status >= 500 ? 502 : response.status
  )
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

    if (!response.ok) throw await readManagementError(response)

    const payload = (await response.json()) as
      | RealtimeManagementResponse
      | Partial<SelfHostedRealtimeConfig>
    const settings = validateManagementSettings(
      isRealtimeConfigPayload(payload)
        ? payload
        : (payload as RealtimeManagementResponse).settings
          ? payload
          : {
              settings: payload as Partial<SelfHostedRealtimeConfig>,
            }
    )
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
