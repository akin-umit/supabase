import { getFormattedLagValue } from '../Replication/ReplicationPipelineStatus/ReplicationPipelineStatus.utils'
import {
  resolveWarehouseTableState,
  type CopyStatus,
  type WarehouseProjectReplicationStatus,
  type WarehouseTableState,
} from './warehouseDemoStore'

export type ReplicationHealth = 'healthy' | 'behind' | 'critical' | 'error'

/** WAL backlog below this is healthy — no lag amount shown in the UI. */
export const REPLICATION_LAG_BEHIND_THRESHOLD_BYTES = 50 * 1024 * 1024

/** WAL backlog at or above this is critical. */
export const REPLICATION_LAG_CRITICAL_THRESHOLD_BYTES = 500 * 1024 * 1024

export function resolveReplicationHealth(
  replication: WarehouseProjectReplicationStatus,
  copyStatus?: CopyStatus
): ReplicationHealth {
  if (
    replication.pipelineStatus === 'error' ||
    replication.replicationPhase === 'error' ||
    copyStatus === 'error'
  ) {
    return 'error'
  }

  const lagBytes = replication.replicationLagBytes ?? 0
  if (lagBytes >= REPLICATION_LAG_CRITICAL_THRESHOLD_BYTES) return 'critical'
  if (lagBytes >= REPLICATION_LAG_BEHIND_THRESHOLD_BYTES) return 'behind'
  return 'healthy'
}

export interface ReplicationLagDisplay {
  health: ReplicationHealth
  headline: string
  /** Bytes formatted for Observability only — not shown in everyday Studio surfaces. */
  lagAmount?: string
  /** Short user-facing health label (no lag amounts). */
  compactSuffix?: string
  tooltip: string
  tone: 'default' | 'warning' | 'destructive'
}

export function getReplicationLagDisplay(
  replication: WarehouseProjectReplicationStatus,
  copyStatus?: CopyStatus
): ReplicationLagDisplay {
  if (copyStatus === 'error' && replication.pipelineStatus === 'live') {
    return {
      health: 'error',
      headline: 'Sync error',
      compactSuffix: 'Error',
      tooltip: 'This Warehouse replica could not stay in sync with Postgres.',
      tone: 'destructive',
    }
  }

  const health = resolveReplicationHealth(replication, copyStatus)
  const lagFormatted = getFormattedLagValue('bytes', replication.replicationLagBytes).display

  if (health === 'error') {
    return {
      health,
      headline: 'Replication error',
      compactSuffix: 'Error',
      tooltip: 'Warehouse replication pipeline encountered an error. Check replication logs.',
      tone: 'destructive',
    }
  }

  if (replication.replicationPhase === 'initial_sync') {
    return {
      health: 'healthy',
      headline: 'Initial sync',
      compactSuffix: 'Catching up',
      tooltip: 'Running the first full sync for this project’s Warehouse pipeline.',
      tone: 'default',
    }
  }

  if (copyStatus === 'backfilling') {
    return {
      health: 'healthy',
      headline: 'Replicating',
      tooltip: 'This Warehouse replica is still catching up.',
      tone: 'default',
    }
  }

  if (health === 'healthy') {
    return {
      health,
      headline: 'Caught up',
      tooltip: 'Warehouse replication is caught up with Postgres.',
      tone: 'default',
    }
  }

  if (health === 'behind') {
    return {
      health,
      headline: 'Replication behind',
      lagAmount: lagFormatted,
      compactSuffix: 'Catching up',
      tooltip:
        'Warehouse replication is catching up. Recent writes may not appear in Warehouse replicas yet.',
      tone: 'warning',
    }
  }

  return {
    health,
    headline: 'Severely behind',
    lagAmount: lagFormatted,
    compactSuffix: 'Degraded',
    tooltip: 'Warehouse replication is degraded. Query results may be stale.',
    tone: 'destructive',
  }
}

/** Unified table status for Settings — project lag supersedes a calm "Live" when reads may be stale. */
export type WarehouseLinkedTableStatus =
  | { type: 'copy'; copyStatus: CopyStatus }
  | {
      type: 'project'
      text: string
      tooltip: string
      tone: ReplicationLagDisplay['tone']
    }

export function getWarehouseLinkedTableStatus(
  lagDisplay: ReplicationLagDisplay | null,
  copyStatus: CopyStatus | undefined
): WarehouseLinkedTableStatus | null {
  if (!copyStatus) return null

  if (copyStatus === 'backfilling' || copyStatus === 'error') {
    return { type: 'copy', copyStatus }
  }

  if (!lagDisplay || (lagDisplay.health === 'healthy' && lagDisplay.headline === 'Caught up')) {
    return { type: 'copy', copyStatus: 'live' }
  }

  return {
    type: 'project',
    text: lagDisplay.compactSuffix ?? lagDisplay.headline,
    tooltip: lagDisplay.tooltip,
    tone: lagDisplay.tone,
  }
}

const COPY_STATUS_SORT_RANK: Record<CopyStatus, number> = {
  error: 0,
  backfilling: 2,
  live: 4,
}

const REPLICATION_HEALTH_SORT_RANK: Record<ReplicationHealth, number> = {
  error: 0,
  critical: 1,
  behind: 2,
  healthy: 3,
}

/** Higher rank = healthier. Tables without a Warehouse replica return -1. */
export function getWarehouseTableStatusSortRank(
  tableKey: string,
  storedState: WarehouseTableState | undefined,
  projectReplication: WarehouseProjectReplicationStatus | null,
  isWarehouseView: boolean
): number {
  const state = resolveWarehouseTableState(tableKey, storedState, { isWarehouseView })

  if (state.mode !== 'has_warehouse_copy' || !state.copyStatus) {
    return -1
  }

  const lagDisplay = projectReplication
    ? getReplicationLagDisplay(projectReplication, state.copyStatus)
    : null
  const linkedStatus = getWarehouseLinkedTableStatus(lagDisplay, state.copyStatus)

  if (!linkedStatus) return -1

  if (linkedStatus.type === 'copy') {
    return COPY_STATUS_SORT_RANK[linkedStatus.copyStatus]
  }

  return lagDisplay ? REPLICATION_HEALTH_SORT_RANK[lagDisplay.health] : 2
}
