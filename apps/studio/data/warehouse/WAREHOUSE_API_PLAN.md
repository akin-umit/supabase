# Warehouse — required new platform endpoints

This document specifies the **new platform API endpoints** the Studio Warehouse feature calls. None
of them exist yet — the Studio hooks in this folder (`data/warehouse/*`) call them and will 404
until the backend ships. The goal here is to design the payloads and enumerate the work for the
platform team. **No platform code has been written.**

The endpoints live in the existing platform API repo (NestJS) alongside replication, e.g.
`/Users/bnj/supabase/platform/api/apps/mgmt-api/src/routes/platform/`.

## Architecture: Warehouse is a thin layer over Replication + DuckLake

The Warehouse product reuses the existing replication/ETL machinery. Conceptually:

- Each project has **at most one** "warehouse pipeline": a DuckLake destination plugged into the
  project itself, plus a pipeline and a publication. Naming convention:
  - pipeline/destination name: `supabase_warehouse_pipeline`
  - publication name: `supabase_warehouse_publication`
- **"Copy to Warehouse"** for a table = ensure that pipeline exists (create it lazily on first use),
  add the table to its publication, and ensure the pipeline is running.
- **"Detach Warehouse copy"** = remove the table from the publication (and drop its DuckLake copy).
- **Catalog access** = a project-level toggle that exposes catalog credentials so external query
  engines can read the DuckLake tables without touching Postgres.

The warehouse endpoints are a **convenience facade** so Studio never has to orchestrate
sources/destinations/pipelines/publications directly. Internally they call the existing replication
service (see `replication.client.ts`) and the DuckLake config resolver
(`ducklake-supabase-config.ts`).

### Existing building blocks reused (already in the platform API)

| Concern                       | Existing endpoint / module                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| Create tenant + source        | `POST /platform/replication/{ref}/tenants-sources`                                    |
| Create destination + pipeline | `POST /platform/replication/{ref}/destinations-pipelines`                             |
| Start / stop pipeline         | `POST /platform/replication/{ref}/pipelines/{id}/start` \| `/stop`                    |
| Pipeline status               | `GET /platform/replication/{ref}/pipelines/{id}/status`                               |
| Per-table replication status  | `GET /platform/replication/{ref}/pipelines/{id}/replication-status`                   |
| Create / update publication   | `POST /platform/replication/{ref}/sources/{source_id}/publications[/{name}]`          |
| DuckLake destination config   | `ReplicationDucklakeConfigSchema` in `destinations.dto.ts` (Supabase-managed variant) |

The DuckLake destination for the warehouse pipeline uses the **Supabase-managed** variant, pointed
at the project itself:

```jsonc
{
  "ducklake": {
    "catalog": { "type": "supabase_project", "project_ref": "<ref>" },
    "storage": { "type": "supabase_storage", "project_ref": "<ref>", "bucket": "warehouse" },
  },
}
```

---

## New endpoints

Base path: `/platform/warehouse/{ref}` (mirrors `/platform/replication/{ref}`).
Auth: `@AuthWithProjectRef(PermissionAction.REPLICATION_ADMIN_READ | WRITE, '*')` (or a dedicated
`WAREHOUSE_ADMIN_*` action). Gate writes behind the same entitlement as ETL
(`@ApiEntitlementRequired('replication.etl')` or a new `warehouse` entitlement).

### 1. List linked tables — `GET /platform/warehouse/{ref}/tables`

Returns every table that currently has a Warehouse copy, with live sync status. Drives the Tables
list chips, the table-detail header badge, and the Storage panel.

Response `200`:

```jsonc
{
  "tables": [
    {
      "schema": "public",
      "name": "orders",
      "state": "live", // 'syncing' | 'live' | 'error'  (derived from replication-status)
      "lag_ms": 12000, // optional
      "last_synced_at": "2026-06-23T17:48:00Z", // optional ISO-8601
      "copy_name": "warehouse.orders",
      "warehouse_size_bytes": 197912092672, // optional
    },
  ],
}
```

Server behavior: if no warehouse pipeline exists, return `{ "tables": [] }`. Otherwise read the
publication's table list and join with `GET .../pipelines/{id}/replication-status` to populate
`state` / `lag_ms` / `last_synced_at`. Tables not in the publication are simply absent (Studio
treats absent = Postgres-only).

Studio hook: `useWarehouseTablesQuery` (`warehouse-tables-query.ts`).

### 2. Link a table ("Copy to Warehouse") — `POST /platform/warehouse/{ref}/tables`

Request:

```jsonc
{ "schema": "public", "name": "orders" }
```

Response `202`: the new linked-table row (same shape as an item in endpoint #1). `state` will
usually be `"syncing"` initially.

Server behavior (idempotent):

1. Ensure the warehouse tenant + source exist (`tenants-sources`).
2. Ensure the `supabase_warehouse_pipeline` destination + pipeline exist. If not, create the
   DuckLake destination (Supabase-managed, pointed at this project) + pipeline +
   `supabase_warehouse_publication` via `destinations-pipelines`.
3. Add `{schema, name}` to `supabase_warehouse_publication` (create-or-update publication).
4. Ensure the pipeline is running (`/start` if stopped).

Errors: `409` if the table can't be replicated (e.g. no primary key / replica identity), `402` if
the entitlement is missing.

Studio hook: `useWarehouseLinkTableMutation` (`link-table-mutation.ts`).

### 3. Detach a table ("Detach Warehouse copy") — `DELETE /platform/warehouse/{ref}/tables/{schema}/{name}`

Response `204`.

Server behavior: remove `{schema, name}` from `supabase_warehouse_publication` (update publication)
and drop the table's DuckLake copy. Leave the pipeline running for the remaining tables; if it was
the last table, the pipeline may be stopped (implementation detail). The Postgres source table is
untouched.

Studio hook: `useWarehouseDetachTableMutation` (`detach-table-mutation.ts`).

### 4. Get catalog access — `GET /platform/warehouse/{ref}/catalog`

Returns whether external catalog access is enabled and, if so, the credentials external query
engines use.

Response `200`:

```jsonc
{
  "enabled": true,
  "credentials": {
    // present only when enabled
    "catalog_uri": "https://catalog.<ref>.supabase.co",
    "access_token": "sbw_...", // secret; only returned to project admins
    "warehouse_id": "wh_...",
  },
}
```

Studio hook: `useWarehouseCatalogQuery` (`warehouse-catalog-query.ts`).

### 5. Enable / disable catalog access — `POST /platform/warehouse/{ref}/catalog`

Request:

```jsonc
{ "enabled": true }
```

Response `200`: same shape as endpoint #4 (on enable, includes freshly provisioned `credentials`).

Server behavior: on enable, provision the catalog endpoint + access token for external readers; on
disable, revoke them. Access is managed independently from the project's database connection
settings.

Studio hook: `useUpdateWarehouseCatalogMutation` (`warehouse-catalog-mutation.ts`).

### (Optional, not yet called by Studio)

- `POST /platform/warehouse/{ref}/catalog/token/rotate` → rotate the access token.
- `GET /platform/warehouse/{ref}` → project-level overview (`{ provisioned, pipeline_id,
pipeline_status, catalog: { enabled } }`) if a single status call is preferred over #1 + #4.

---

## ⚠️ Open question: catalog credentials shape (DuckLake vs Iceberg REST)

The credentials triple above (`catalog_uri` / `access_token` / `warehouse_id`) and the per-engine
snippets in `warehouseCatalog.constants.ts` are currently written for an **Iceberg REST catalog**
(the prototype mocked it that way). The Warehouse product is backed by **DuckLake**, whose external
access model is different — typically a **Postgres catalog connection** plus **object-storage
credentials** rather than a REST endpoint + token.

Before GA, decide one of:

1. Expose DuckLake directly → credentials become `{ catalog_postgres_url, storage_endpoint,
storage_access_key_id, storage_secret_access_key, ... }`, and the DuckDB/Spark/Trino/PyIceberg
   snippets change to `ATTACH 'ducklake:postgres:...'`-style configs.
2. Front DuckLake with an Iceberg-REST-compatible catalog → keep the current triple + snippets.

The Studio data layer isolates this: only `WarehouseCatalogCredentials` (`warehouse-catalog-query.ts`)
and `warehouseCatalog.constants.ts` need to change when the shape is finalized.

---

## Hook → endpoint → underlying replication mapping

| Studio hook                         | New warehouse endpoint                              | Underlying replication work                                                                |
| ----------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `useWarehouseTablesQuery`           | `GET .../warehouse/{ref}/tables`                    | read publication tables + `replication-status`                                             |
| `useWarehouseLinkTableMutation`     | `POST .../warehouse/{ref}/tables`                   | ensure pipeline (`tenants-sources`, `destinations-pipelines`) + update publication + start |
| `useWarehouseDetachTableMutation`   | `DELETE .../warehouse/{ref}/tables/{schema}/{name}` | update publication (remove table)                                                          |
| `useWarehouseCatalogQuery`          | `GET .../warehouse/{ref}/catalog`                   | read catalog access + credentials                                                          |
| `useUpdateWarehouseCatalogMutation` | `POST .../warehouse/{ref}/catalog`                  | provision/revoke catalog credentials                                                       |

## Excluded (deferred upstream)

- **Move to Warehouse** (fully migrating a table off the Postgres heap) — already deferred to a
  separate branch; no endpoint designed here.
- **Snapshots / time-travel** — only surfaced after a Move in the prototype; out of scope.
