# Warehouse table metadata API contract

Prototype Studio code uses `?view=warehouse` on table detail URLs and `warehouseDemoStore` until table metadata queries return warehouse fields. Platform warehouse endpoints landed in [platform#34689](https://github.com/supabase/platform/pull/34689) (staging only); Studio is not wired to them yet. User-facing copy follows `WAREHOUSE_NAMING.md`.

## Goals

- Replace `?view=warehouse` query-param context with server truth
- Replace `warehouseDemoStore` enable/detach/sync fields with API responses
- Support **copy mode** (postgres + warehouse) and **warehouse-only** (post-Move, no postgres table)

## Platform REST endpoints (staging)

Base path: `/platform/warehouse/{ref}`

All endpoints require bearer auth, Warehouse feature access, and an active healthy project.

- **Read** endpoints: `replication:Admin:Read`
- **Write** endpoints: `replication:Admin:Write` plus the `replication.etl` entitlement

### Shared types

```ts
type WarehouseTable = {
  schema: string
  name: string
}

type WarehouseLinkedTable = WarehouseTable & {
  state: 'syncing' | 'live' | 'error'
  lag_ms?: number
  copy_name: string // e.g. "public_warehouse.orders"
}
```

**Studio vocabulary mapping** (apply in a thin adapter when wiring queries):

| Platform API       | Studio prototype / UI                                                             |
| ------------------ | --------------------------------------------------------------------------------- |
| `state: 'syncing'` | `copyStatus: 'backfilling'` → label **Replicating** (see `WAREHOUSE_NAMING.md`)   |
| `state: 'live'`    | `copyStatus: 'live'` → label **Live**                                             |
| `state: 'error'`   | `copyStatus: 'error'` → label **Error**                                           |
| `copy_name`        | `warehouse_qualified_name` / `getWarehouseQualifiedTableName()`                   |
| `lag_ms`           | Not shown in everyday UI; prefer project `replication_lag_bytes` in Observability |

### `GET /platform/warehouse/{ref}/setup-status`

Primary polling endpoint after link. Poll until `setup_status` is `complete` or `error`. Show `steps[].message` when present.

```ts
type SetupStatusResponse = {
  setup_status: 'not_started' | 'setting_up' | 'copying' | 'installing_fdw' | 'complete' | 'error'
  pipeline_id?: number
  steps: Array<{
    name: 'warehouse_pipeline' | 'warehouse_copy' | 'warehouse_fdw'
    status: 'waiting' | 'running' | 'completed' | 'error'
    message?: string
  }>
  tables: WarehouseLinkedTable[]
  fdw_status: {
    extension_installed: boolean
    wrapper_installed: boolean
    server_configured: boolean
    schema_created: boolean
    foreign_schema_imported: boolean
  }
}
```

### `GET /platform/warehouse/{ref}/tables`

```ts
type TablesResponse = {
  tables: WarehouseLinkedTable[]
}
```

`state` semantics:

- `syncing`: initial copy queued/running or status unavailable
- `live`: table is following WAL
- `error`: replication failed for that table

### `POST /platform/warehouse/{ref}/tables`

Status: `202 Accepted`

```ts
type LinkTableBody = {
  schema: string // e.g. "public"
  name: string // e.g. "orders"
}

type LinkTableResponse = WarehouseLinkedTable
```

Creates Warehouse replication resources if needed, adds the table to the Warehouse publication, starts or restarts the pipeline, and enqueues async FDW setup. Response is immediate; poll `GET /setup-status` for progress.

### `DELETE /platform/warehouse/{ref}/tables/{schema}/{name}`

Status: `204 No Content`

Removes the table from the Warehouse publication and restarts the running pipeline. Existing Warehouse/DuckLake data is left in place.

### `GET /platform/warehouse/{ref}/tables/{schema}/{name}/snapshots?limit=50`

`limit`: optional integer, `1..100`, default `50`.

```ts
type SnapshotsResponse = {
  snapshots: Array<{
    snapshot_id: string
    snapshot_time: string | null
    schema_version: string | null
    changes: string | null
    author: string | null
    commit_message: string | null
    commit_extra_info: string | null
  }>
}
```

Returns `404` if the table is not linked. Depends on FDW setup — expose snapshots only after `setup_status` is `complete`.

### `GET /platform/warehouse/{ref}/catalog`

```ts
type CatalogResponse = {
  enabled: boolean
  credentials?: {
    catalog_url: string
    data_path: string
    s3_endpoint: string
    s3_region: string
    s3_access_key_id: string
    s3_secret_access_key: string
    metadata_schema: string // usually "ducklake"
  }
}
```

`credentials` is present only when `enabled` is true.

### `POST /platform/warehouse/{ref}/catalog`

```ts
type CatalogBody = {
  enabled: boolean
}

type CatalogPostResponse = CatalogResponse
```

- `enabled: true`: provisions or returns external Warehouse catalog credentials
- `enabled: false`: disables access and deletes Warehouse catalog storage credentials

### Recommended Studio wiring flow

1. Load `GET /tables` and `GET /setup-status` on Warehouse surfaces mount
2. User confirms replicate → `POST /tables` with `{ schema, name }`
3. Show returned table immediately as `syncing` (UI: **Replicating**)
4. Poll `GET /setup-status` until `complete` or `error`
5. Detach via `DELETE /tables/{schema}/{name}`
6. Snapshots: replicated tables only, preferably after setup is `complete`

Target react-query layer: `apps/studio/data/warehouse/` (not created yet).

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
| `backfilling` | **Replicating**   | Spinner                                 |
| `live`        | **Live**          | Pulsing dot                             |
| `error`       | **Error**         | Red dot (hidden in Table Editor footer) |

### Amalgamation rules (one status shown)

1. **Table replica state wins** for `backfilling` (UI: Replicating) or `error` on the table.
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

Detach (replication stopped, postgres remains): `storage_mode` returns to `postgres`; warehouse schema row disappears from list.

## Replicate flow (Studio UX)

Replicating a table and catching up are **two phases**:

| Phase            | User action       | API                                                                | Studio                                      |
| ---------------- | ----------------- | ------------------------------------------------------------------ | ------------------------------------------- |
| **1. Replicate** | Confirm in dialog | `POST /platform/warehouse/{ref}/tables` → `202`, returns `syncing` | Button loading only; dialog closes on `2xx` |
| **2. Catch up**  | (background)      | Poll `GET /setup-status`; table `state: 'syncing'` → `'live'`      | Replication status chip + Storage panel     |

The dialog must **not** block until replication catches up. Failures during replicate return an error in the dialog; failures during catch-up set `warehouse_copy_status: 'error'`.

Optional future fields for richer progress (not required for MVP): `warehouse_backfill_rows_done`, `warehouse_backfill_rows_total`, or bytes copied.

### Session notifications (MVP)

| Event                                 | Toast                                                         | Suppressed when                                                                                |
| ------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Replicate accepted                    | `"Warehouse replication started"`                             | -                                                                                              |
| Replica live (`backfilling` → `live`) | `"Warehouse replica is live"` + qualified name in description | User is on that table's **Settings** tab or **warehouse detail** view (status already visible) |

Long-running work does not use a notifications inbox in MVP; in-session sonner toasts cover start and completion when the user is elsewhere in Studio.

## Demo store mapping (interim)

| Demo store                                       | Platform API equivalent                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `mode: 'postgres'`                               | Table absent from `GET /tables`                                                             |
| `mode: 'has_warehouse_copy'`                     | Row in `GET /tables` with `state` + `copy_name`                                             |
| `copyStatus: 'backfilling' \| 'live' \| 'error'` | `WarehouseLinkedTable.state` (`syncing` → `backfilling` internally → **Replicating** in UI) |
| `copyName` (implicit via naming utils)           | `copy_name`                                                                                 |
| `sourceTableId`                                  | Postgres table OID (for completion toast CTA; not on platform API)                          |
| `projectReplication.replicationLagBytes`         | `replication_lag_bytes` (project; future monitor/setup-status)                              |
| `projectReplication.replicationPhase`            | Derived from `setup_status` / pipeline state                                                |
| (not implemented)                                | `storage_mode: 'warehouse_only'`                                                            |
| `catalogEnabled`                                 | `GET /catalog` → `enabled`                                                                  |
| `WAREHOUSE_CATALOG_CREDENTIALS` (constants)      | `GET /catalog` → `credentials`                                                              |

Remove `warehouseDemoStore` when `GET /tables` + `GET /setup-status` replace local state and list/detail queries return `WarehouseTableMetadata`.

## Connect sheet (catalog mode)

Warehouse catalog credentials in the Connect sheet are isolated from Data API gating in `ConnectStepsSection`:

| Surface                 | Mode                                     | Disabled warning                                                             | Enable CTA                 |
| ----------------------- | ---------------------------------------- | ---------------------------------------------------------------------------- | -------------------------- |
| `ConnectStepsSection`   | `framework`, `mcp` (database tools only) | Inline warning when Data API off; steps remain visible (auth/env still work) | Data API settings          |
| `WarehouseCatalogPanel` | `catalog`                                | Catalog integration off                                                      | Warehouse catalog overview |

**Mode visibility:** `catalog` appears in the Connect mode selector only when at least one Warehouse replica exists (`hasWarehouseTables()`). If the last replica is removed while `catalog` is selected, Studio falls back to the first available connect mode.

**Status query behavior (target API):** When `catalogEnabled` is backed by an API query, follow the same fail-open pattern as Data API connect gating — do not show the disabled notice while loading or when the query errors. For Data API, show an inline warning (not a full panel block) so auth and env setup steps remain available.

## Observability

**Observability → Warehouse** reads `WarehouseProjectReplicationStatus` plus a Warehouse replica count derived from tables with `storage_mode = postgres_with_warehouse_copy`. Prototype uses mock sparklines until the monitor API is available.
