/**
 * Studio-facing model for the Warehouse product.
 *
 * Under the hood a "Warehouse copy" is a table linked into the project's DuckLake replication
 * pipeline (`supabase_warehouse_pipeline`) and added to its publication. These types describe what
 * the table surfaces need, decoupled from the lower-level replication/destination payloads.
 */

export type WarehouseMode = 'postgres' | 'has_warehouse_copy'
export type WarehouseSyncState = 'syncing' | 'live' | 'error'

/** Row returned by `GET /platform/warehouse/{ref}/tables` (snake_case, mirrors the API). */
export interface WarehouseLinkedTable {
  schema: string
  name: string
  state: WarehouseSyncState
  lag_ms?: number
  last_synced_at?: string
  copy_name: string
  warehouse_size_bytes?: number
}

/** UI-facing per-table storage state consumed by the table surfaces. */
export interface WarehouseTableState {
  mode: WarehouseMode
  syncState?: WarehouseSyncState
  lagSeconds?: number
  lastSyncedAt?: string
  copyName?: string
  warehouseSizeBytes?: number
}

/** Default state for a table that has not been linked to Warehouse. */
export const POSTGRES_TABLE_STATE: WarehouseTableState = { mode: 'postgres' }

export const tableKeyOf = (schema: string, name: string) => `${schema}.${name}`

/** Maps an API linked-table row onto the UI-facing state. A listed table always has a copy. */
export function tableStateFromLinkedTable(table: WarehouseLinkedTable): WarehouseTableState {
  return {
    mode: 'has_warehouse_copy',
    syncState: table.state,
    lagSeconds: table.lag_ms !== undefined ? Math.round(table.lag_ms / 1000) : undefined,
    lastSyncedAt: table.last_synced_at,
    copyName: table.copy_name,
    warehouseSizeBytes: table.warehouse_size_bytes,
  }
}

export function formatWarehouseSize(bytes: number | undefined): string {
  if (bytes === undefined) return '—'
  const gb = bytes / 1024 ** 3
  return `${Math.round(gb)} GB`
}

/**
 * Inline storage summary shown next to a table (e.g. "112 kB · Copy · 184 GB"). Returns null when
 * the table lives only in the Postgres heap so callers can fall back to the plain Postgres size.
 */
export function getWarehouseStorageSummaryLabel(
  state: Pick<WarehouseTableState, 'mode' | 'warehouseSizeBytes'> | undefined,
  postgresSize?: string
): string | null {
  const mode = state?.mode ?? 'postgres'
  if (mode === 'postgres') return null

  const hasSize = state?.warehouseSizeBytes !== undefined
  const warehouseSize = formatWarehouseSize(state?.warehouseSizeBytes)

  if (postgresSize && hasSize) return `${postgresSize} · Copy · ${warehouseSize}`
  if (postgresSize) return `${postgresSize} · Copy`
  if (hasSize) return `Copy · ${warehouseSize}`
  return 'Copy'
}
