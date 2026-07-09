import {
  resolveWarehouseTableState,
  useProjectReplication,
  useWarehouseTableState,
} from './warehouseDemoStore'
import {
  getReplicationLagDisplay,
  getWarehouseLinkedTableStatus,
} from './warehouseReplication.utils'
import { WarehouseCopyStatus, WarehouseStatusText } from './WarehouseSyncChip'

interface WarehouseLinkedTableStatusProps {
  tableKey: string
  isWarehouseView?: boolean
  className?: string
  showLeadingIndicator?: boolean
}

/** Single amalgamated Warehouse replication status (per-replica state + project replication). */
export function WarehouseLinkedTableStatus({
  tableKey,
  isWarehouseView = false,
  className,
  showLeadingIndicator = true,
}: WarehouseLinkedTableStatusProps) {
  const storedState = useWarehouseTableState(tableKey)
  const projectReplication = useProjectReplication()
  const state = resolveWarehouseTableState(tableKey, storedState, { isWarehouseView })

  if (state.mode !== 'has_warehouse_copy' || !state.copyStatus) return null

  const lagDisplay = projectReplication
    ? getReplicationLagDisplay(projectReplication, state.copyStatus)
    : null
  const linkedTableStatus = getWarehouseLinkedTableStatus(lagDisplay, state.copyStatus)

  if (!linkedTableStatus) return null

  if (linkedTableStatus.type === 'copy') {
    return (
      <WarehouseCopyStatus
        copyStatus={linkedTableStatus.copyStatus}
        appearance="inline"
        className={className}
        showLeadingIndicator={showLeadingIndicator}
      />
    )
  }

  return (
    <WarehouseStatusText
      text={linkedTableStatus.text}
      tooltip={linkedTableStatus.tooltip}
      tone={linkedTableStatus.tone}
      className={className}
    />
  )
}
