import type { WarehouseCatalogCredentials } from '@/data/warehouse/warehouse-catalog-query'

export type WarehouseCatalogEngine = 'duckdb' | 'env'

export const WAREHOUSE_CATALOG_ENGINES: { key: WarehouseCatalogEngine; label: string }[] = [
  { key: 'duckdb', label: 'DuckDB' },
  { key: 'env', label: 'Environment variables' },
]

export const WAREHOUSE_CATALOG_ENV_VARS = {
  catalogUrl: 'DUCKLAKE_CATALOG_URL',
  dataPath: 'DUCKLAKE_DATA_PATH',
  s3Endpoint: 'DUCKLAKE_S3_ENDPOINT',
  s3Region: 'DUCKLAKE_S3_REGION',
  s3AccessKeyId: 'DUCKLAKE_S3_ACCESS_KEY_ID',
  s3SecretAccessKey: 'DUCKLAKE_S3_SECRET_ACCESS_KEY',
  metadataSchema: 'DUCKLAKE_METADATA_SCHEMA',
} as const

export function buildWarehouseCatalogEnv(creds: WarehouseCatalogCredentials): string {
  return [
    `${WAREHOUSE_CATALOG_ENV_VARS.catalogUrl}=${creds.catalogUrl}`,
    `${WAREHOUSE_CATALOG_ENV_VARS.dataPath}=${creds.dataPath}`,
    `${WAREHOUSE_CATALOG_ENV_VARS.s3Endpoint}=${creds.s3Endpoint}`,
    `${WAREHOUSE_CATALOG_ENV_VARS.s3Region}=${creds.s3Region}`,
    `${WAREHOUSE_CATALOG_ENV_VARS.s3AccessKeyId}=${creds.s3AccessKeyId}`,
    `${WAREHOUSE_CATALOG_ENV_VARS.s3SecretAccessKey}=${creds.s3SecretAccessKey}`,
    `${WAREHOUSE_CATALOG_ENV_VARS.metadataSchema}=${creds.metadataSchema}`,
  ].join('\n')
}

/**
 * Per-engine connection snippet for the Warehouse catalog. The Warehouse is backed by DuckLake
 * (a Postgres catalog + object storage), so DuckDB attaches it via the `ducklake` extension.
 */
export function getWarehouseCatalogEngineContent(
  engine: WarehouseCatalogEngine,
  creds: WarehouseCatalogCredentials
): { headerLabel: string; language: 'sql' | 'bash'; value: string } {
  switch (engine) {
    case 'duckdb':
      return {
        headerLabel: 'warehouse.sql',
        language: 'sql',
        value: `INSTALL ducklake;
INSTALL postgres;
INSTALL httpfs;
LOAD ducklake;

CREATE SECRET supabase_warehouse_storage (
  TYPE s3,
  KEY_ID '${creds.s3AccessKeyId}',
  SECRET '${creds.s3SecretAccessKey}',
  REGION '${creds.s3Region}',
  ENDPOINT '${creds.s3Endpoint}',
  URL_STYLE 'path'
);

ATTACH 'ducklake:${creds.catalogUrl}' AS warehouse (
  DATA_PATH '${creds.dataPath}',
  METADATA_SCHEMA '${creds.metadataSchema}'
);

USE warehouse;
SELECT * FROM events LIMIT 10;`,
      }
    case 'env':
    default:
      return {
        headerLabel: 'catalog.env',
        language: 'bash',
        value: buildWarehouseCatalogEnv(creds),
      }
  }
}
