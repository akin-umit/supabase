import type { components } from 'api-types'

import { assertSelfHosted } from './util'

type StorageConfigResponse = components['schemas']['StorageConfigResponse']
type UpdateStorageConfigBody = components['schemas']['UpdateStorageConfigBody']

const DEFAULT_FILE_SIZE_LIMIT = 50 * 1024 * 1024

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

const parseNumber = (value: string | undefined, fallback: number) => {
  if (value === undefined || value.trim().length === 0) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function getSelfHostedStorageConfig(
  overrides: UpdateStorageConfigBody = {}
): StorageConfigResponse {
  assertSelfHosted()

  const s3ProtocolEnabled = parseBoolean(
    process.env.STORAGE_S3_PROTOCOL_ENABLED,
    Boolean(
      process.env.S3_PROTOCOL_ACCESS_KEY_ID ||
        process.env.S3_PROTOCOL_ACCESS_KEY_SECRET ||
        process.env.STORAGE_S3_PROTOCOL_ACCESS_KEY_ID ||
        process.env.STORAGE_S3_PROTOCOL_ACCESS_KEY_SECRET
    )
  )

  const base: StorageConfigResponse = {
    capabilities: {
      iceberg_catalog: parseBoolean(process.env.STORAGE_ICEBERG_CATALOG_ENABLED, false),
      list_v2: true,
    },
    databasePoolMode: process.env.STORAGE_DATABASE_POOL_MODE ?? 'transaction',
    external: {
      upstreamTarget: 'main',
    },
    features: {
      icebergCatalog: {
        enabled: parseBoolean(process.env.STORAGE_ICEBERG_CATALOG_ENABLED, false),
        maxCatalogs: parseNumber(process.env.STORAGE_ICEBERG_MAX_CATALOGS, 0),
        maxNamespaces: parseNumber(process.env.STORAGE_ICEBERG_MAX_NAMESPACES, 0),
        maxTables: parseNumber(process.env.STORAGE_ICEBERG_MAX_TABLES, 0),
      },
      imageTransformation: {
        enabled: parseBoolean(process.env.IMGPROXY_ENABLE_WEBP_DETECTION, true),
      },
      s3Protocol: {
        enabled: s3ProtocolEnabled,
      },
      vectorBuckets: {
        enabled: parseBoolean(process.env.STORAGE_VECTOR_BUCKETS_ENABLED, true),
        maxBuckets: parseNumber(process.env.STORAGE_VECTOR_BUCKETS_MAX_BUCKETS, 100),
        maxIndexes: parseNumber(process.env.STORAGE_VECTOR_BUCKETS_MAX_INDEXES, 100),
      },
    },
    fileSizeLimit: parseNumber(process.env.STORAGE_FILE_SIZE_LIMIT, DEFAULT_FILE_SIZE_LIMIT),
    migrationVersion: process.env.STORAGE_MIGRATION_VERSION ?? 'self-hosted',
  }

  return {
    ...base,
    ...overrides,
    external: {
      ...base.external,
      ...overrides.external,
    },
    features: {
      ...base.features,
      ...overrides.features,
      icebergCatalog: {
        ...base.features.icebergCatalog,
        ...overrides.features?.icebergCatalog,
      },
      imageTransformation: {
        ...base.features.imageTransformation,
        ...overrides.features?.imageTransformation,
      },
      s3Protocol: {
        ...base.features.s3Protocol,
        ...overrides.features?.s3Protocol,
      },
      vectorBuckets: {
        ...base.features.vectorBuckets,
        ...overrides.features?.vectorBuckets,
      },
    },
  }
}
