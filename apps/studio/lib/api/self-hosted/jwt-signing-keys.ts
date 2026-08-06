import { randomUUID } from 'node:crypto'
import { z } from 'zod'

import { assertSelfHosted } from './util'

const REQUEST_TIMEOUT_MS = 10_000
const projectRefSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/)
const keyIdSchema = z.string().uuid()

const managementKeySchema = z
  .object({
    id: keyIdSchema,
    kid: z.string().optional(),
    algorithm: z.enum(['EdDSA', 'ES256', 'RS256', 'HS256']),
    status: z.enum(['active', 'standby', 'previous', 'previously_used', 'revoked']),
    publicJwk: z.unknown().optional(),
    public_jwk: z.unknown().optional(),
    createdAt: z.string().datetime().optional(),
    created_at: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
  })
  .strip()

const managementListSchema = z.object({ keys: z.array(managementKeySchema) }).strip()
const managementItemSchema = z.object({ key: managementKeySchema }).strip()

export type SelfHostedSigningKey = {
  id: string
  algorithm: 'EdDSA' | 'ES256' | 'RS256' | 'HS256'
  status: 'in_use' | 'standby' | 'previously_used' | 'revoked'
  public_jwk?: unknown
  created_at: string
  updated_at: string
}

export class JwtSigningKeysManagementApiError extends Error {
  constructor(
    message: string,
    public statusCode = 500
  ) {
    super(message)
    this.name = 'JwtSigningKeysManagementApiError'
  }
}

function projectPath(projectRef: string) {
  const parsed = projectRefSchema.safeParse(projectRef)
  if (!parsed.success) throw new JwtSigningKeysManagementApiError('Invalid project reference', 400)
  return `/v1/projects/${encodeURIComponent(parsed.data)}/auth/jwt-keys`
}

function keyPath(projectRef: string, keyId: string) {
  const parsed = keyIdSchema.safeParse(keyId)
  if (!parsed.success) throw new JwtSigningKeysManagementApiError('Invalid signing key id', 400)
  return `${projectPath(projectRef)}/${encodeURIComponent(parsed.data)}`
}

async function managementRequest(pathname: string, init: RequestInit) {
  assertSelfHosted()
  const write = init.method !== undefined && init.method !== 'GET'
  const baseUrl = process.env.INTERNAL_MANAGEMENT_API_URL
  const token = write
    ? process.env.INTERNAL_MANAGEMENT_API_WRITE_TOKEN
    : (process.env.INTERNAL_MANAGEMENT_API_TOKEN ?? process.env.INTERNAL_MANAGEMENT_API_WRITE_TOKEN)

  if (!baseUrl || !token) {
    throw new JwtSigningKeysManagementApiError('JWT signing key management is not configured', 503)
  }

  let url: URL
  try {
    url = new URL(baseUrl)
  } catch {
    throw new JwtSigningKeysManagementApiError('JWT signing key management is not configured', 503)
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new JwtSigningKeysManagementApiError('JWT signing key management is not configured', 503)
  }

  url.pathname = pathname
  url.search = ''
  url.hash = ''

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Management-Actor': 'studio-admin',
        ...init.headers,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new JwtSigningKeysManagementApiError(
        response.status === 404
          ? 'JWT signing key was not found'
          : 'JWT signing key operation failed',
        response.status === 404 ? 404 : response.status === 409 ? 409 : 502
      )
    }
    return await response.json()
  } catch (error) {
    if (error instanceof JwtSigningKeysManagementApiError) throw error
    throw new JwtSigningKeysManagementApiError('Unable to reach JWT signing key management', 502)
  }
}

function toStudioKey(input: z.infer<typeof managementKeySchema>): SelfHostedSigningKey {
  const createdAt = input.created_at ?? input.createdAt ?? input.updated_at ?? input.updatedAt
  const updatedAt = input.updated_at ?? input.updatedAt ?? createdAt
  if (!createdAt || !updatedAt) {
    throw new JwtSigningKeysManagementApiError('JWT signing key response has no timestamps', 502)
  }

  return {
    id: input.id,
    algorithm: input.algorithm,
    status:
      input.status === 'active'
        ? 'in_use'
        : input.status === 'previous'
          ? 'previously_used'
          : input.status,
    public_jwk: input.public_jwk ?? input.publicJwk,
    created_at: createdAt,
    updated_at: updatedAt,
  }
}

export async function listSelfHostedSigningKeys(projectRef: string) {
  const parsed = managementListSchema.safeParse(
    await managementRequest(projectPath(projectRef), { method: 'GET' })
  )
  if (!parsed.success) {
    throw new JwtSigningKeysManagementApiError('JWT signing key response was invalid', 502)
  }
  return { keys: parsed.data.keys.map(toStudioKey) }
}

export async function createSelfHostedStandbyKey(projectRef: string) {
  const parsed = managementItemSchema.safeParse(
    await managementRequest(projectPath(projectRef), {
      method: 'POST',
      headers: { 'Idempotency-Key': randomUUID() },
    })
  )
  if (!parsed.success) {
    throw new JwtSigningKeysManagementApiError('JWT signing key response was invalid', 502)
  }
  return toStudioKey(parsed.data.key)
}

export async function updateSelfHostedSigningKey(
  projectRef: string,
  keyId: string,
  status: string
) {
  if (status === 'in_use') {
    const parsed = managementItemSchema.safeParse(
      await managementRequest(`${keyPath(projectRef, keyId)}/switch`, { method: 'POST' })
    )
    if (!parsed.success) {
      throw new JwtSigningKeysManagementApiError('JWT signing key response was invalid', 502)
    }
    return toStudioKey(parsed.data.key)
  }

  if (status === 'revoked') return revokeSelfHostedSigningKey(projectRef, keyId)
  throw new JwtSigningKeysManagementApiError('Unsupported signing key transition', 409)
}

export async function revokeSelfHostedSigningKey(projectRef: string, keyId: string) {
  const parsed = managementItemSchema.safeParse(
    await managementRequest(keyPath(projectRef, keyId), { method: 'DELETE' })
  )
  if (!parsed.success) {
    throw new JwtSigningKeysManagementApiError('JWT signing key response was invalid', 502)
  }
  return { ...toStudioKey(parsed.data.key), status: 'revoked' as const }
}
