import { randomUUID } from 'node:crypto'

import { assertSelfHosted } from './util'

const PROJECT_REF = /^[A-Za-z0-9_-]{1,64}$/
const RESOURCE_SEGMENT = /^[A-Za-z0-9_-]{1,64}$/
const ALLOWED_ROOTS = new Set([
  'replication',
  'backups',
  'pitr',
  'migrations',
  'auth',
  'storage',
  'integrations',
  'webhooks',
])

export class SelfHostedManagementError extends Error {
  constructor(
    message: string,
    public statusCode = 500
  ) {
    super(message)
    this.name = 'SelfHostedManagementError'
  }
}

function managementUrl(projectRef: string, resource: string[]) {
  if (!PROJECT_REF.test(projectRef)) {
    throw new SelfHostedManagementError('Invalid project reference', 400)
  }
  if (
    resource.length === 0 ||
    resource.length > 5 ||
    !ALLOWED_ROOTS.has(resource[0]) ||
    resource.some((segment) => !RESOURCE_SEGMENT.test(segment))
  ) {
    throw new SelfHostedManagementError('Invalid management resource', 400)
  }

  const configured = process.env.INTERNAL_MANAGEMENT_API_URL
  if (!configured) throw new SelfHostedManagementError('Management API is not configured', 503)

  let url: URL
  try {
    url = new URL(configured)
  } catch {
    throw new SelfHostedManagementError('Management API is not configured', 503)
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new SelfHostedManagementError('Management API is not configured', 503)
  }

  url.pathname = `/v1/projects/${encodeURIComponent(projectRef)}/${resource
    .map(encodeURIComponent)
    .join('/')}`
  url.search = ''
  url.hash = ''
  return url
}

export async function requestSelfHostedManagement({
  projectRef,
  resource,
  method,
  body,
}: {
  projectRef: string
  resource: string[]
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
}) {
  assertSelfHosted()
  const write = method !== 'GET'
  const token = write
    ? process.env.INTERNAL_MANAGEMENT_API_WRITE_TOKEN
    : process.env.INTERNAL_MANAGEMENT_API_TOKEN ?? process.env.INTERNAL_MANAGEMENT_API_WRITE_TOKEN
  if (!token) throw new SelfHostedManagementError('Management API is not configured', 503)

  try {
    const response = await fetch(managementUrl(projectRef, resource), {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(write
          ? {
              'Content-Type': 'application/json',
              'Idempotency-Key': `studio-${randomUUID()}`,
              'X-Management-Actor': 'studio-admin',
            }
          : {}),
      },
      body: write ? JSON.stringify(body ?? {}) : undefined,
      signal: AbortSignal.timeout(15_000),
    })
    const payload = await response.json().catch(() => undefined)
    if (!response.ok) {
      throw new SelfHostedManagementError(
        payload?.message ?? payload?.error ?? 'Management operation failed',
        response.status === 404 || response.status === 405 ? 503 : response.status
      )
    }
    return payload
  } catch (error) {
    if (error instanceof SelfHostedManagementError) throw error
    throw new SelfHostedManagementError('Unable to reach management API', 502)
  }
}
