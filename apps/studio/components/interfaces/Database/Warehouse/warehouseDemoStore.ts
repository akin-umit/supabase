import { proxy, useSnapshot } from 'valtio'

import { getWarehouseQualifiedTableName } from './warehouseNaming.utils'

export type WarehouseMode = 'postgres' | 'has_warehouse_copy'
export type CopyStatus = 'backfilling' | 'live' | 'error'
export type ReplicationPhase = 'initial_sync' | 'streaming' | 'error'
export type PipelineStatus = 'live' | 'error'

/** @deprecated Use CopyStatus */
export type SyncState = CopyStatus

export interface WarehouseProjectReplicationStatus {
  /** WAL backlog not yet flushed to Warehouse for this project (bytes). */
  replicationLagBytes: number
  replicationPhase: ReplicationPhase
  pipelineStatus: PipelineStatus
}

export type WarehouseDemoReplicationPreset =
  | 'healthy'
  | 'behind'
  | 'critical'
  | 'pipeline_error'
  | 'copy_error'

export interface WarehouseTableState {
  mode: WarehouseMode
  copyStatus?: CopyStatus
  lastSyncedAt?: string
  copyName?: string
  warehouseSizeBytes?: number
  /** Postgres table OID — used for completion toast navigation. */
  sourceTableId?: number
}

export const warehouseDemoStore = proxy<{
  tables: Record<string, WarehouseTableState>
  catalogEnabled: boolean
  projectReplication: WarehouseProjectReplicationStatus | null
  /** Demo: next Replicate to Warehouse action fails instead of creating a replica. */
  simulateNextLinkFailure: boolean
}>({
  tables: {},
  catalogEnabled: false,
  projectReplication: null,
  simulateNextLinkFailure: false,
})

const DEMO_WAREHOUSE_SIZE_BYTES = 197_912_092_672 // ~184 GB
const BACKFILLING_TRANSITION_MS = 8000

const DEFAULT_WAREHOUSE_COPY_FIELDS = {
  copyStatus: 'live' as const,
  warehouseSizeBytes: DEMO_WAREHOUSE_SIZE_BYTES,
}

const DEFAULT_PROJECT_REPLICATION: WarehouseProjectReplicationStatus = {
  replicationLagBytes: 0,
  replicationPhase: 'streaming',
  pipelineStatus: 'live',
}

const DEMO_LAG_BEHIND_BYTES = 80 * 1024 * 1024
const DEMO_LAG_CRITICAL_BYTES = 600 * 1024 * 1024

export function repairProjectReplicationIfNeeded(): void {
  if (countLinkedWarehouseTablesInStore() === 0 || warehouseDemoStore.projectReplication) return

  warehouseDemoStore.projectReplication = {
    ...DEFAULT_PROJECT_REPLICATION,
    replicationPhase: 'streaming',
  }
}

export function setSimulateNextLinkFailure(enabled: boolean): void {
  warehouseDemoStore.simulateNextLinkFailure = enabled
}

function countLinkedWarehouseTablesInStore(): number {
  return Object.values(warehouseDemoStore.tables).filter(
    (table) => table.mode === 'has_warehouse_copy'
  ).length
}

function ensureProjectReplication(isFirstLinkedTable: boolean): void {
  if (warehouseDemoStore.projectReplication) return

  warehouseDemoStore.projectReplication = {
    ...DEFAULT_PROJECT_REPLICATION,
    replicationPhase: isFirstLinkedTable ? 'initial_sync' : 'streaming',
  }
}

export function countLinkedWarehouseTables(): number {
  return countLinkedWarehouseTablesInStore()
}

export function hasWarehouseTables(): boolean {
  return countLinkedWarehouseTablesInStore() > 0
}

export function resolveWarehouseTableState(
  tableKey: string,
  storedState: WarehouseTableState | undefined,
  { isWarehouseView }: { isWarehouseView: boolean }
): WarehouseTableState {
  const resolved = storedState ?? { mode: 'postgres' }
  const hasWarehouseCopy = resolved.mode === 'has_warehouse_copy' || isWarehouseView
  if (!hasWarehouseCopy) return resolved

  return {
    mode: 'has_warehouse_copy',
    copyStatus: resolved.copyStatus ?? DEFAULT_WAREHOUSE_COPY_FIELDS.copyStatus,
    warehouseSizeBytes:
      resolved.warehouseSizeBytes ?? DEFAULT_WAREHOUSE_COPY_FIELDS.warehouseSizeBytes,
    lastSyncedAt: resolved.lastSyncedAt,
    copyName: resolved.copyName ?? getWarehouseQualifiedTableName(tableKey),
  }
}

export function setTableMode(
  key: string,
  mode: 'has_warehouse_copy',
  options?: { sourceTableId?: number }
): void {
  const now = new Date().toISOString()
  const isFirstLinkedTable = countLinkedWarehouseTablesInStore() === 0

  ensureProjectReplication(isFirstLinkedTable)

  warehouseDemoStore.tables[key] = {
    mode,
    warehouseSizeBytes: DEMO_WAREHOUSE_SIZE_BYTES,
    copyStatus: 'backfilling',
    lastSyncedAt: now,
    copyName: getWarehouseQualifiedTableName(key),
    ...(options?.sourceTableId !== undefined && { sourceTableId: options.sourceTableId }),
  }

  setTimeout(() => {
    const table = warehouseDemoStore.tables[key]
    if (table?.copyStatus !== 'backfilling') return

    table.copyStatus = 'live'
    table.lastSyncedAt = new Date().toISOString()

    if (warehouseDemoStore.projectReplication?.replicationPhase === 'initial_sync') {
      warehouseDemoStore.projectReplication.replicationPhase = 'streaming'
    }
  }, BACKFILLING_TRANSITION_MS)
}

export function setTableCopyError(key: string): void {
  const table = warehouseDemoStore.tables[key]
  if (table?.mode !== 'has_warehouse_copy') return
  table.copyStatus = 'error'
}

export function clearTableCopyError(key: string): void {
  const table = warehouseDemoStore.tables[key]
  if (table?.copyStatus === 'error') {
    table.copyStatus = 'live'
    table.lastSyncedAt = new Date().toISOString()
  }
}

export function applyWarehouseDemoReplicationPreset(
  preset: WarehouseDemoReplicationPreset
): boolean {
  repairProjectReplicationIfNeeded()

  const linkedTableKeys = Object.entries(warehouseDemoStore.tables)
    .filter(([, table]) => table.mode === 'has_warehouse_copy')
    .map(([key]) => key)

  if (linkedTableKeys.length === 0) {
    return false
  }

  switch (preset) {
    case 'healthy':
      warehouseDemoStore.projectReplication = {
        replicationLagBytes: 0,
        replicationPhase: 'streaming',
        pipelineStatus: 'live',
      }
      for (const key of linkedTableKeys) {
        clearTableCopyError(key)
      }
      break
    case 'behind':
      warehouseDemoStore.projectReplication = {
        replicationLagBytes: DEMO_LAG_BEHIND_BYTES,
        replicationPhase: 'streaming',
        pipelineStatus: 'live',
      }
      for (const key of linkedTableKeys) {
        clearTableCopyError(key)
      }
      break
    case 'critical':
      warehouseDemoStore.projectReplication = {
        replicationLagBytes: DEMO_LAG_CRITICAL_BYTES,
        replicationPhase: 'streaming',
        pipelineStatus: 'live',
      }
      for (const key of linkedTableKeys) {
        clearTableCopyError(key)
      }
      break
    case 'pipeline_error':
      warehouseDemoStore.projectReplication = {
        replicationLagBytes: DEMO_LAG_CRITICAL_BYTES,
        replicationPhase: 'error',
        pipelineStatus: 'error',
      }
      break
    case 'copy_error':
      warehouseDemoStore.projectReplication = {
        replicationLagBytes: 0,
        replicationPhase: 'streaming',
        pipelineStatus: 'live',
      }
      for (const key of linkedTableKeys) {
        setTableCopyError(key)
      }
      break
  }

  return true
}

export function clearTableMode(key: string): void {
  delete warehouseDemoStore.tables[key]

  if (countLinkedWarehouseTablesInStore() === 0) {
    warehouseDemoStore.projectReplication = null
  }
}

export function setCatalogEnabled(enabled: boolean): void {
  warehouseDemoStore.catalogEnabled = enabled
}

export function useWarehouseTableState(tableKey: string): WarehouseTableState {
  const snap = useSnapshot(warehouseDemoStore)
  return (snap.tables[tableKey] as WarehouseTableState | undefined) ?? { mode: 'postgres' }
}

export function useProjectReplication(): WarehouseProjectReplicationStatus | null {
  const snap = useSnapshot(warehouseDemoStore)
  if (snap.projectReplication) {
    return snap.projectReplication as WarehouseProjectReplicationStatus
  }
  const hasLinkedTables = Object.values(snap.tables).some(
    (table) => table.mode === 'has_warehouse_copy'
  )
  if (hasLinkedTables) {
    return DEFAULT_PROJECT_REPLICATION
  }
  return null
}

export function formatWarehouseSize(bytes: number | undefined): string {
  if (bytes === undefined) return '184 GB'
  const gb = bytes / 1024 ** 3
  return `${Math.round(gb)} GB`
}

export function formatReplicationPhase(phase: ReplicationPhase): string {
  switch (phase) {
    case 'initial_sync':
      return 'Initial sync'
    case 'streaming':
      return 'Streaming'
    case 'error':
      return 'Error'
  }
}

export interface WarehouseStorageDisplay {
  postgresSize: string | null
  warehouseCopySize: string
}

export function getWarehouseStorageDisplay(
  state: Pick<WarehouseTableState, 'mode' | 'warehouseSizeBytes'> | undefined,
  postgresSize?: string,
  warehouseSize?: string
): WarehouseStorageDisplay | null {
  const mode = state?.mode ?? 'postgres'
  if (mode === 'postgres') return null

  const resolvedPostgres = postgresSize ?? null
  const warehouseCopySize =
    warehouseSize ?? postgresSize ?? formatWarehouseSize(state?.warehouseSizeBytes)

  return {
    postgresSize: resolvedPostgres,
    warehouseCopySize,
  }
}

/** Linked-table storage tooltip. Order matches the active lens (postgres or warehouse). */
export function getWarehouseLinkedStorageTooltip(
  display: WarehouseStorageDisplay,
  isWarehouseView: boolean
): string {
  const { postgresSize, warehouseCopySize } = display

  if (postgresSize) {
    return isWarehouseView
      ? `Warehouse: ${warehouseCopySize} · Postgres: ${postgresSize}`
      : `Postgres: ${postgresSize} · Warehouse: ${warehouseCopySize}`
  }

  return `Warehouse: ${warehouseCopySize}`
}

export function getWarehouseStorageTooltip(display: WarehouseStorageDisplay): string {
  return getWarehouseLinkedStorageTooltip(display, false)
}

/** @deprecated Use getWarehouseLinkedStorageTooltip with a full WarehouseStorageDisplay */
export function getWarehouseLensSizeTooltip(
  warehouseSize: string,
  _sourceTableKey: string,
  postgresSize?: string | null
): string {
  return getWarehouseLinkedStorageTooltip(
    { postgresSize: postgresSize ?? null, warehouseCopySize: warehouseSize },
    true
  )
}

/** @deprecated Prefer postgres size in UI with getWarehouseStorageTooltip on a Linked hint. */
export function formatWarehouseStorageSummaryLabel(display: WarehouseStorageDisplay): string {
  return display.postgresSize ?? display.warehouseCopySize
}

export const WAREHOUSE_STORAGE_CELL_TOOLTIP =
  'This table has a Postgres heap for writes and a Warehouse replica for analytics.'

export function getWarehouseStorageSummaryLabel(
  state: Pick<WarehouseTableState, 'mode' | 'warehouseSizeBytes'> | undefined,
  postgresSize?: string
): string | null {
  const display = getWarehouseStorageDisplay(state, postgresSize)
  if (!display) return null
  return formatWarehouseStorageSummaryLabel(display)
}
