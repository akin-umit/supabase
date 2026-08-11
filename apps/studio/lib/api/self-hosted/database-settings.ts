import { randomUUID } from 'node:crypto'
import { z } from 'zod'

import { assertSelfHosted } from './util'

const REQUEST_TIMEOUT_MS = 5_000

const projectRefSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/)
const operationIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/)

const databaseSettingsSchema = z
  .object({
    log_connections: z.boolean(),
    log_disconnections: z.boolean(),
  })
  .strip()

const operationSchema = z
  .object({
    id: operationIdSchema,
    status: z.enum(['queued', 'accepted', 'running', 'succeeded', 'failed', 'cancelled']),
    code: z
      .string()
      .regex(/^[A-Za-z0-9_.-]{1,100}$/)
      .optional(),
  })
  .strip()

const managementSettingSchema = z
  .object({
    name: z.string().min(1),
    value: z.string(),
    unit: z.string().optional(),
    vartype: z.string().optional(),
    context: z.string().optional(),
    enumvals: z.array(z.string()).optional(),
    min_val: z.string().optional(),
    max_val: z.string().optional(),
    pendingRestart: z.boolean().optional().default(false),
  })
  .strip()

const managementResponseSchema = z
  .object({
    settings: z.array(managementSettingSchema),
    operation: operationSchema.optional(),
  })
  .strip()

const operationResponseSchema = z.object({ operation: operationSchema }).strip()
const databaseSettingsResponseSchema = z
  .object({
    settings: databaseSettingsSchema,
    settingsList: z.array(managementSettingSchema).optional(),
    operation: operationSchema.optional(),
  })
  .strip()

export const databaseSettingsUpdateSchema = databaseSettingsSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one database setting is required',
  })

export type DatabaseSettings = z.infer<typeof databaseSettingsSchema>
export type DatabaseSettingSummary = z.infer<typeof managementSettingSchema>
export type DatabaseSettingsOperation = z.infer<typeof operationSchema>
export type DatabaseSettingsResponse = z.infer<typeof databaseSettingsResponseSchema>

const DEFAULT_DATABASE_SETTINGS: DatabaseSettings = {
  log_connections: false,
  log_disconnections: false,
}

export class DatabaseSettingsManagementApiError extends Error {
  constructor(
    message: string,
    public statusCode = 500
  ) {
    super(message)
    this.name = 'DatabaseSettingsManagementApiError'
  }
}

function getManagementUrl(pathname: string, write = false) {
  const baseUrl = process.env.INTERNAL_MANAGEMENT_API_URL
  const token = write
    ? process.env.INTERNAL_MANAGEMENT_API_WRITE_TOKEN
    : (process.env.INTERNAL_MANAGEMENT_API_TOKEN ?? process.env.INTERNAL_MANAGEMENT_API_WRITE_TOKEN)

  if (!baseUrl || !token) {
    throw new DatabaseSettingsManagementApiError(
      'Database settings management API is not configured',
      503
    )
  }

  let url: URL
  try {
    url = new URL(baseUrl)
  } catch {
    throw new DatabaseSettingsManagementApiError(
      'Database settings management API is not configured',
      503
    )
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new DatabaseSettingsManagementApiError(
      'Database settings management API is not configured',
      503
    )
  }

  url.pathname = pathname
  url.search = ''
  url.hash = ''

  return { url, token }
}

function getProjectPath(projectRef: string) {
  const result = projectRefSchema.safeParse(projectRef)
  if (!result.success) {
    throw new DatabaseSettingsManagementApiError('Invalid project reference', 400)
  }

  return `/v1/projects/${encodeURIComponent(result.data)}`
}

async function requestManagementApi(pathname: string, init: RequestInit) {
  const write = init.method !== undefined && init.method !== 'GET'
  const { url, token } = getManagementUrl(pathname, write)

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      const statusCode = response.status === 404 || response.status === 405 ? 503 : 502
      throw new DatabaseSettingsManagementApiError(
        'Database settings management API request failed',
        statusCode
      )
    }

    try {
      return await response.json()
    } catch {
      throw new DatabaseSettingsManagementApiError(
        'Database settings management API response was invalid',
        502
      )
    }
  } catch (error) {
    if (error instanceof DatabaseSettingsManagementApiError) throw error

    throw new DatabaseSettingsManagementApiError(
      'Unable to reach database settings management API',
      502
    )
  }
}

export async function getDatabaseSettings(projectRef: string): Promise<DatabaseSettingsResponse> {
  assertSelfHosted()

  const payload = await requestManagementApi(`${getProjectPath(projectRef)}/database/settings`, {
    method: 'GET',
  })
  const result = managementResponseSchema.safeParse(payload)

  if (!result.success) {
    throw new DatabaseSettingsManagementApiError(
      'Database settings management API response was invalid',
      502
    )
  }

  const values = Object.fromEntries(
    result.data.settings
      .filter((setting) => setting.name in databaseSettingsSchema.shape)
      .map((setting) => [setting.name, setting.value === 'on'])
  )
  return {
    settings: databaseSettingsSchema.parse({ ...DEFAULT_DATABASE_SETTINGS, ...values }),
    settingsList: result.data.settings,
    operation: result.data.operation,
  }
}

export async function updateDatabaseSettings(
  projectRef: string,
  body: unknown
): Promise<DatabaseSettingsResponse> {
  assertSelfHosted()

  const update = databaseSettingsUpdateSchema.safeParse(body)
  if (!update.success) {
    throw new DatabaseSettingsManagementApiError('Invalid database settings', 400)
  }

  const payload = await requestManagementApi(`${getProjectPath(projectRef)}/database/settings`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': randomUUID(),
      'X-Management-Actor': 'studio-admin',
    },
    body: JSON.stringify({ settings: update.data }),
  })
  const result = managementResponseSchema.safeParse(payload)

  if (!result.success) {
    throw new DatabaseSettingsManagementApiError(
      'Database settings management API response was invalid',
      502
    )
  }

  const values = Object.fromEntries(
    result.data.settings
      .filter((setting) => setting.name in databaseSettingsSchema.shape)
      .map((setting) => [setting.name, setting.value === 'on'])
  )
  return {
    settings: databaseSettingsSchema.parse({ ...DEFAULT_DATABASE_SETTINGS, ...values }),
    settingsList: result.data.settings,
    operation: result.data.operation,
  }
}

export async function getDatabaseSettingsOperation(
  projectRef: string,
  operationId: string
): Promise<DatabaseSettingsOperation> {
  assertSelfHosted()

  const operation = operationIdSchema.safeParse(operationId)
  if (!operation.success) {
    throw new DatabaseSettingsManagementApiError('Invalid operation reference', 400)
  }

  const payload = await requestManagementApi(
    `${getProjectPath(projectRef)}/operations/${encodeURIComponent(operation.data)}`,
    { method: 'GET' }
  )
  const result = operationResponseSchema.safeParse(payload)

  if (!result.success) {
    throw new DatabaseSettingsManagementApiError(
      'Database settings operation response was invalid',
      502
    )
  }

  return result.data.operation
}
