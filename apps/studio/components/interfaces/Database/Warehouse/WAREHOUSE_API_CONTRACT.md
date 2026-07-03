# Warehouse table metadata API contract

Prototype Studio code uses `?view=warehouse` on table detail URLs and `warehouseDemoStore` until table metadata queries return warehouse fields. Platform warehouse endpoints landed in [platform#34689](https://github.com/supabase/platform/pull/34689) (staging only); Studio is not wired to them yet.

## Goals

- Replace `?view=warehouse` query-param context with server truth
- Replace `warehouseDemoStore` enable/detach/sync fields with API responses
- Support **copy mode** (postgres + warehouse) and **warehouse-only** (post-Move, no postgres table)

## Project-level replication status

One Warehouse replication pipeline serves all linked tables. Lag and phase are **project-scoped**, not per-table.

```ts
type ReplicationPhase = 'initial_sync' | 'streaming' | 'error'
type PipelineStatus = 'live' | 'error'
type ReplicationHealth = 'healthy' | 'behind' | 'critical' | 'error'

interface WarehouseProjectReplicationStatus {
  /** WAL backlog not yet flushed to Warehouse (bytes). Aligns with ETL `confirmed_flush_lsn_bytes`. */
  replication_lag_bytes: number
  /** Derived in Studio from thresholds on `replication_lag_bytes` plus pipeline/copy errors. */
  replication_health?: ReplicationHealth
  replication_phase: ReplicationPhase
  pipeline_status: PipelineStatus
}
```

Platform may also expose `lag_ms` on linked-table responses; prefer **bytes** for operator surfaces (Observability). Everyday Studio UI uses `replication_health` buckets only — do not show lag amounts in table list, detail, storage panel, or table editor.

Consumed by **Observability → Warehouse** (mock sparklines in prototype; real monitor API later).

## Replication health and Studio display

Studio derives a **single amalgamated status** per linked table from two inputs:

| Input               | Scope       | API field                                                                                           |
| ------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| Table copy progress | Per table   | `warehouse_copy_status`                                                                             |
| Replication health  | Per project | `replication_health` (derived from `replication_lag_bytes`, `pipeline_status`, `replication_phase`) |

Implementation: `warehouseReplication.utils.ts` (`resolveReplicationHealth`, `getWarehouseLinkedTableStatus`).

### Project `replication_health` buckets

Derived from WAL backlog (`replication_lag_bytes`) and pipeline state. Thresholds are an implementation detail; users never see byte amounts outside Observability.

| Bucket     | Condition (prototype)                          | User-facing label                 |
| ---------- | ---------------------------------------------- | --------------------------------- |
| `healthy`  | Lag &lt; 50 MB, pipeline live, phase streaming | **Live** (when copy is also live) |
| `behind`   | 50 MB ≤ lag &lt; 500 MB                        | **Catching up**                   |
| `critical` | Lag ≥ 500 MB                                   | **Degraded**                      |
| `error`    | Pipeline or phase error                        | **Error**                         |

`initial_sync` phase maps to **Catching up** at project scope.

### Table `warehouse_copy_status` labels

| Copy status   | User-facing label | Leading indicator                       |
| ------------- | ----------------- | --------------------------------------- |
| `backfilling` | **Backfilling**   | Spinner                                 |
| `live`        | **Live**          | Pulsing dot                             |
| `error`       | **Error**         | Red dot (hidden in Table Editor footer) |

### Amalgamation rules (one status shown)

1. **Table copy wins** for `backfilling` or `error` on the table.
2. Otherwise, if project replication is not caught up, **project health supersedes Live** (`Catching up`, `Degraded`, `Error`).
3. Otherwise **Live** when copy is `live` and project is healthy.

### Where labels appear

| Surface                                    | What users see                                                              |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| Tables list → Warehouse column             | Amalgamated status                                                          |
| Table detail header / Storage panel Status | Same                                                                        |
| Table Editor footer                        | Expectation tooltip on label; amalgamated status only when not healthy Live |
| Observability                              | Byte lag, sparklines, operator detail                                       |

### Table Editor expectation copy

Warehouse lens footer always explains that rows replicate from Postgres and recent writes may not appear yet. This sets expectations; it does not replace health status when replication is unhealthy.

## Proposed fields on table metadata

Returned by table editor / catalog queries (`getTableEditor`, table list, etc.):

```ts
type TableStorageMode = 'postgres' | 'postgres_with_warehouse_copy' | 'warehouse_only'
type CopyStatus = 'backfilling' | 'live' | 'error'

interface WarehouseTableMetadata {
  /** How this table is stored and surfaced in Studio */
  storage_mode: TableStorageMode

  /**
   * OID of the related table on the other side, when applicable.
   * - copy mode, viewing postgres: warehouse table OID
   * - copy mode, viewing warehouse: postgres table OID
   * - warehouse_only: omitted
   */
  linked_table_id?: number

  /** Warehouse schema name when a copy exists or this is a warehouse table (e.g. public_warehouse) */
  warehouse_schema?: string

  /** Qualified warehouse relation name (e.g. public_warehouse.events) */
  warehouse_qualified_name?: string

  /** Table-scoped copy progress (not project lag) */
  warehouse_copy_status?: CopyStatus
  warehouse_size_bytes?: number
  warehouse_last_synced_at?: string
}
```

**Do not** put per-table lag on table metadata. Lag belongs on `WarehouseProjectReplicationStatus`.

## Studio routing rules (target)

| `storage_mode`                 | List schema          | Row click URL                          | Detail page                                         |
| ------------------------------ | -------------------- | -------------------------------------- | --------------------------------------------------- |
| `postgres`                     | `public`             | `/database/tables/{id}`                | Full postgres tabs                                  |
| `postgres_with_warehouse_copy` | `public`             | `/database/tables/{id}`                | Full postgres tabs; Settings > Storage manages copy |
| `postgres_with_warehouse_copy` | `{source}_warehouse` | `/database/tables/{id}?view=warehouse` | Single warehouse detail page                        |
| `warehouse_only`               | `{source}_warehouse` | `/database/tables/{id}?view=warehouse` | Single warehouse detail page (canonical home)       |

After API lands, `view=warehouse` becomes optional when the requested table OID is already the warehouse relation (`table.schema` ends with `_warehouse`).

## Lifecycle: Move

1. **Before Move**: `storage_mode = postgres_with_warehouse_copy`, postgres OID is primary, warehouse detail is a read-only lens.
2. **After Move**: `storage_mode = warehouse_only`, postgres table removed, warehouse OID is primary. Postgres detail URL should 404 or redirect to warehouse detail.

Detach (link removed, postgres remains): `storage_mode` returns to `postgres`; warehouse schema row disappears from list.

## Link enable flow (Studio UX)

Linking a table and backfilling it are **two phases**:

| Phase           | User action       | API                                               | Studio                                                |
| --------------- | ----------------- | ------------------------------------------------- | ----------------------------------------------------- |
| **1. Link**     | Confirm in dialog | `POST` linked-table (accepts quickly)             | Button loading only; dialog closes on `2xx`           |
| **2. Backfill** | (background)      | `warehouse_copy_status: 'backfilling'` → `'live'` | Sync status chip + Storage panel; poll table metadata |

The dialog must **not** block until backfill completes. Failures during link return an error in the dialog; failures during backfill set `warehouse_copy_status: 'error'`.

Optional future fields for richer progress (not required for MVP): `warehouse_backfill_rows_done`, `warehouse_backfill_rows_total`, or bytes copied.

### Session notifications (MVP)

| Event                                      | Toast                                                      | Suppressed when                                                                                |
| ------------------------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Link accepted                              | `"Warehouse link started"`                                 | -                                                                                              |
| Backfill complete (`backfilling` → `live`) | `"Warehouse link is live"` + qualified name in description | User is on that table's **Settings** tab or **warehouse detail** view (status already visible) |

Long-running work does not use a notifications inbox in MVP; in-session sonner toasts cover start and completion when the user is elsewhere in Studio.

## Demo store mapping (interim)

| Demo store                                       | API equivalent                                 |
| ------------------------------------------------ | ---------------------------------------------- |
| `mode: 'postgres'`                               | `storage_mode: 'postgres'`                     |
| `mode: 'has_warehouse_copy'`                     | `storage_mode: 'postgres_with_warehouse_copy'` |
| `copyStatus: 'backfilling' \| 'live' \| 'error'` | `warehouse_copy_status`                        |
| `sourceTableId`                                  | Postgres table OID (for completion toast CTA)  |
| `projectReplication.replicationLagBytes`         | `replication_lag_bytes` (project)              |
| `projectReplication.replicationPhase`            | `replication_phase` (project)                  |
| (not implemented)                                | `storage_mode: 'warehouse_only'`               |
| `catalogEnabled`                                 | `catalog_enabled` (project)                    |

Remove `warehouseDemoStore` when list/detail queries return `WarehouseTableMetadata` and a project replication endpoint exists.

## Connect sheet (catalog mode)

Warehouse catalog credentials in the Connect sheet are isolated from Data API gating in `ConnectStepsSection`:

| Surface                 | Mode                                     | Disabled warning                                                             | Enable CTA                 |
| ----------------------- | ---------------------------------------- | ---------------------------------------------------------------------------- | -------------------------- |
| `ConnectStepsSection`   | `framework`, `mcp` (database tools only) | Inline warning when Data API off; steps remain visible (auth/env still work) | Data API settings          |
| `WarehouseCatalogPanel` | `catalog`                                | Catalog integration off                                                      | Warehouse catalog overview |

**Mode visibility:** `catalog` appears in the Connect mode selector only when at least one warehouse-linked table exists (`hasWarehouseTables()`). If the last linked table is removed while `catalog` is selected, Studio falls back to the first available connect mode.

**Status query behavior (target API):** When `catalogEnabled` is backed by an API query, follow the same fail-open pattern as Data API connect gating — do not show the disabled notice while loading or when the query errors. For Data API, show an inline warning (not a full panel block) so auth and env setup steps remain available.

## Observability

**Observability → Warehouse** reads `WarehouseProjectReplicationStatus` plus a linked-table count derived from tables with `storage_mode = postgres_with_warehouse_copy`. Prototype uses mock sparklines until the monitor API is available.
