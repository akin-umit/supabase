import { resolveWarehouseTableState, useWarehouseTableState } from './warehouseDemoStore'
import { WarehouseLinkedTableStatus } from './WarehouseLinkedTableStatus'

interface TableListWarehouseStatusCellProps {
  tableKey: string
  isWarehouseSchemaView: boolean
}

/** Matches the Storage panel Status row — full amalgamated replication status. */
export function TableListWarehouseStatusCell({
  tableKey,
  isWarehouseSchemaView,
}: TableListWarehouseStatusCellProps) {
  const storedState = useWarehouseTableState(tableKey)
  const state = resolveWarehouseTableState(tableKey, storedState, {
    isWarehouseView: isWarehouseSchemaView,
  })

  if (state.mode !== 'has_warehouse_copy' || !state.copyStatus) {
    return <p className="text-sm text-foreground-muted">—</p>
  }

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <WarehouseLinkedTableStatus tableKey={tableKey} isWarehouseView={isWarehouseSchemaView} />
    </div>
  )
}
