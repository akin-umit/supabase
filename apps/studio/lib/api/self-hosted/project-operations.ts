import { z } from 'zod'

import { assertSelfHosted } from './util'

const REQUEST_TIMEOUT_MS = 5_000
const OVERVIEW_PATH = '/v1/overview'

const isoTimestampSchema = z.string().datetime({ offset: true })
const serviceNameSchema = z.string().trim().min(1).max(100)
const versionSchema = z.string().trim().min(1).max(100)
const commitSchema = z.union([z.string().regex(/^[a-f\d]{7,40}$/i), z.literal('unknown')])

const deploymentSchema = z
  .object({
    commit: commitSchema,
    version: versionSchema,
  })
  .strip()

const backupSchema = z
  .object({
    status: z.enum(['verified', 'unavailable']),
    lastVerifiedAt: isoTimestampSchema.optional(),
  })
  .strip()

const migrationSchema = z
  .object({
    status: z.enum(['applied', 'unavailable']),
    lastApplied: z.string().trim().min(1).max(200).optional(),
    appliedAt: isoTimestampSchema.optional(),
  })
  .strip()

const infrastructureSchema = z
  .object({
    database: z
      .object({
        host: z.string().trim().min(1).max(255),
        port: z.number().int().min(1).max(65_535),
        maxClientConnections: z.number().int().min(1).max(1_000_000).optional(),
      })
      .strip(),
    runtime: z
      .object({
        cpuPercent: z.number().min(0).max(100).optional(),
        diskPercent: z.number().min(0).max(100).optional(),
        memoryPercent: z.number().min(0).max(100).optional(),
        connectionsCurrent: z.number().int().min(0).max(1_000_000).optional(),
        connectionsMax: z.number().int().min(1).max(1_000_000).optional(),
        updatedAt: isoTimestampSchema.optional(),
      })
      .strip()
      .optional(),
    services: z
      .object({
        total: z.number().int().min(0).max(1000).default(0),
        healthy: z.number().int().min(0).max(1000).default(0),
        unavailable: z.number().int().min(0).max(1000).default(0),
      })
      .strip(),
  })
  .strip()

const projectOperationsSchema = z
  .object({
    generatedAt: isoTimestampSchema,
    status: z.enum(['healthy', 'degraded']),
    services: z.record(serviceNameSchema, z.enum(['healthy', 'unavailable'])),
    deployment: deploymentSchema,
    backup: backupSchema,
    migration: migrationSchema,
    infrastructure: infrastructureSchema.optional(),
  })
  .strip()

export type ProjectOperations = z.infer<typeof projectOperationsSchema>

function getOverviewUrl(baseUrl: string) {
  const url = new URL(baseUrl)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Invalid management API URL')
  }
  url.pathname = OVERVIEW_PATH
  url.search = ''
  url.hash = ''
  return url
}

/**
 * Retrieves the operational overview from the self-hosted management service.
 *
 * _Only call this from server-side self-hosted code._
 */
export async function getProjectOperations(): Promise<ProjectOperations> {
  assertSelfHosted()

  const baseUrl = process.env.INTERNAL_MANAGEMENT_API_URL
  const token = process.env.INTERNAL_MANAGEMENT_API_TOKEN

  if (!baseUrl || !token) {
    throw new Error('Project operations are not configured')
  }

  let url: URL
  try {
    url = getOverviewUrl(baseUrl)
  } catch {
    throw new Error('Project operations are not configured')
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error('Project operations request failed')
    }

    const result = projectOperationsSchema.safeParse(await response.json())
    if (!result.success) {
      throw new Error('Project operations response was invalid')
    }

    return result.data
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Project operations')) {
      throw error
    }

    throw new Error('Unable to retrieve project operations')
  }
}
