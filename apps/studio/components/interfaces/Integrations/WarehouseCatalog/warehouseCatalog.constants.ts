import type { WarehouseCatalogCredentials } from '@/data/warehouse/warehouse-catalog-query'

export type WarehouseCatalogEngine = 'env' | 'duckdb' | 'spark' | 'trino' | 'pyiceberg'

export const WAREHOUSE_CATALOG_ENGINES: { key: WarehouseCatalogEngine; label: string }[] = [
  { key: 'env', label: 'Environment variables' },
  { key: 'duckdb', label: 'DuckDB' },
  { key: 'spark', label: 'Spark' },
  { key: 'trino', label: 'Trino' },
  { key: 'pyiceberg', label: 'PyIceberg' },
]

export const WAREHOUSE_CATALOG_ENV_VARS = {
  catalogUri: 'CATALOG_URI',
  accessToken: 'ACCESS_TOKEN',
  warehouseIdentifier: 'WAREHOUSE_IDENTIFIER',
} as const

export function buildWarehouseCatalogEnv(creds: WarehouseCatalogCredentials): string {
  return [
    `${WAREHOUSE_CATALOG_ENV_VARS.catalogUri}=${creds.catalogUri}`,
    `${WAREHOUSE_CATALOG_ENV_VARS.accessToken}=${creds.accessToken}`,
    `${WAREHOUSE_CATALOG_ENV_VARS.warehouseIdentifier}=${creds.warehouseId}`,
  ].join('\n')
}

/**
 * Per-engine connection snippets for the Warehouse catalog.
 *
 * NOTE: these templates are currently written against an Iceberg REST catalog shape
 * (`uri` / `token` / `warehouse`). The Warehouse product is backed by DuckLake, whose external
 * access model differs (a Postgres catalog connection + object storage). The credential triple
 * and these snippets should be revisited with the DuckLake catalog design before GA — see the
 * warehouse endpoints plan.
 */
export function getWarehouseCatalogEngineContent(
  engine: WarehouseCatalogEngine,
  creds: WarehouseCatalogCredentials
): { headerLabel: string; language: 'sql' | 'toml' | 'python'; value: string } {
  const { catalogUri, accessToken, warehouseId } = creds

  switch (engine) {
    case 'duckdb':
      return {
        headerLabel: 'duckdb.sql',
        language: 'sql',
        value: `INSTALL iceberg;
LOAD iceberg;

CREATE SECRET supabase_catalog (
  TYPE ICEBERG,
  ENDPOINT '${catalogUri}',
  TOKEN '${accessToken}',
  WAREHOUSE '${warehouseId}'
);

ATTACH 'warehouse' AS wh (
  TYPE ICEBERG,
  SECRET supabase_catalog
);

SELECT * FROM wh.events LIMIT 10;`,
      }
    case 'spark':
      return {
        headerLabel: 'spark-defaults.conf',
        language: 'toml',
        value: `spark.sql.catalog.warehouse=org.apache.iceberg.spark.SparkCatalog
spark.sql.catalog.warehouse.catalog-impl=org.apache.iceberg.rest.RESTCatalog
spark.sql.catalog.warehouse.uri=${catalogUri}
spark.sql.catalog.warehouse.token=${accessToken}
spark.sql.catalog.warehouse.warehouse=${warehouseId}`,
      }
    case 'trino':
      return {
        headerLabel: 'warehouse.properties',
        language: 'toml',
        value: `connector.name=iceberg
iceberg.catalog.type=rest
iceberg.rest-catalog.uri=${catalogUri}
iceberg.rest-catalog.token=${accessToken}
iceberg.rest-catalog.warehouse=${warehouseId}`,
      }
    case 'pyiceberg':
      return {
        headerLabel: 'catalog.py',
        language: 'python',
        value: `from pyiceberg.catalog import load_catalog

catalog = load_catalog(
    "warehouse",
    **{
        "uri": "${catalogUri}",
        "token": "${accessToken}",
        "warehouse": "${warehouseId}",
    },
)

table = catalog.load_table("events")
print(table.scan().to_pandas().head())`,
      }
    case 'env':
    default:
      return {
        headerLabel: 'catalog.env',
        language: 'toml',
        value: buildWarehouseCatalogEnv(creds),
      }
  }
}
