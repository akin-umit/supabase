# Warehouse product naming

Studio copy for Warehouse uses **replicate** as the shared verb and **qualified nouns** for the destination. The goal is one replication mental model across destinations (Warehouse, read replicas, external pipelines) without teaching another product concept.

## Principles

1. **Verb stays lean** — `replicate`, `replicating`, `stop replicating`
2. **Noun carries the destination** — always qualify: **Warehouse replica**, **read replica**
3. **Never bare "replica"** in user-facing UI without a destination prefix
4. **Avoid loaded terms** — do not use `link`, `linked`, `copy`, or `mirror` in product copy (platform API types may still use them)

## User-facing vocabulary

| Concept              | Use                                                 | Avoid                                        |
| -------------------- | --------------------------------------------------- | -------------------------------------------- |
| Primary action       | **Replicate to Warehouse**                          | Link to Warehouse, Copy to Warehouse         |
| In progress          | **Replicating**                                     | Backfilling, Syncing, Linking                |
| Steady state         | **Live**                                            | Replica live (unless emphasis needed)        |
| The analytical table | **Warehouse replica** (`public_warehouse.events`)   | Linked table, Warehouse copy, mirrored table |
| Ongoing process      | **Warehouse replication**                           | Warehouse link, sync                         |
| Remove               | **Stop replicating** / **Remove Warehouse replica** | Unlink, Detach, Delete copy                  |
| Settings section     | **Warehouse replication** (storage panel)           | Warehouse link settings                      |
| Project metric       | **Warehouse replicas** (count)                      | Linked tables, table copies                  |
| Postgres product     | **Read replica**                                    | Replica (alone)                              |

## Status labels

| Internal state (`copyStatus`) | Platform API (`state`) | UI label        |
| ----------------------------- | ---------------------- | --------------- |
| `backfilling`                 | `syncing`              | **Replicating** |
| `live`                        | `live`                 | **Live**        |
| `error`                       | `error`                | **Error**       |

Project-scoped health (when table is live but pipeline is behind):

| Internal health | UI label                                       |
| --------------- | ---------------------------------------------- |
| `healthy`       | **Live** (quiet when combined with live table) |
| `behind`        | **Catching up**                                |
| `critical`      | **Degraded**                                   |
| `error`         | **Error**                                      |

## Example copy

| Surface                   | Copy                                   |
| ------------------------- | -------------------------------------- |
| Enable CTA                | Replicate to Warehouse                 |
| Enable dialog title       | Replicate table to Warehouse           |
| Enable success toast      | Warehouse replication started          |
| Completion toast          | Warehouse replica is live              |
| Enable error toast        | Failed to replicate table to Warehouse |
| Detach CTA                | Stop replicating                       |
| Detach confirm title      | Stop replicating to Warehouse?         |
| Detach success toast      | Stopped replicating to Warehouse       |
| Table Editor footer       | Warehouse replica                      |
| Schema admonition title   | Viewing Warehouse replica              |
| Storage panel row         | Warehouse replica                      |
| Observability empty state | No Warehouse replicas yet              |

## Internal code (not user-facing)

Prototype internals may still use legacy identifiers until platform wiring lands:

| Internal                  | Meaning                             |
| ------------------------- | ----------------------------------- |
| `has_warehouse_copy`      | Table has a Warehouse replica       |
| `copyStatus`              | Per-replica replication state       |
| `CopyStatus`              | Type alias for replica state enum   |
| `simulateNextLinkFailure` | Demo: fail next replicate action    |
| `WarehouseLinkedTable`    | Platform API type (Ben's contract)  |
| `copy_name`               | Platform API qualified replica name |

Map platform → UI in one adapter layer; do not leak API names into labels. See `WAREHOUSE_API_CONTRACT.md` for endpoint paths.

## Terms we rejected

| Term                      | Why                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------ |
| **Link / linked**         | Reads like foreign keys or ETL pipeline config; collides with relationship semantics |
| **Copy**                  | Implies a one-off snapshot, not ongoing replication                                  |
| **Mirror**                | Clear in Snowflake, but adds vocabulary without tying to Postgres replication        |
| **Replica** (unqualified) | Collides with read replicas and other destinations                                   |
