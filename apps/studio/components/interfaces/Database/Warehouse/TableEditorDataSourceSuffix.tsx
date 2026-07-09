import { useSnapshot } from 'valtio'

import {
  resolveWarehouseTableState,
  useProjectReplication,
  warehouseDemoStore,
} from './warehouseDemoStore'
import { WarehouseLinkedTableStatus } from './WarehouseLinkedTableStatus'
import { getSourceTableKey, isWarehouseSchema } from './warehouseNaming.utils'
import {
  getReplicationLagDisplay,
  getWarehouseLinkedTableStatus,
} from './warehouseReplication.utils'
import { WarehouseStatusText } from './WarehouseSyncChip'

export const WAREHOUSE_TABLE_EDITOR_TOOLTIP =
  'This is a Warehouse replica. Rows replicate from Postgres. Recent writes may not appear here yet.'

const footerTextSizeClassName = 'text-xs'
const footerLabelClassName = 'text-xs text-foreground-light'

function shouldShowWarehouseEditorStatus(
  tableKey: string,
  isWarehouseView: boolean,
  projectReplication: ReturnType<typeof useProjectReplication>,
  storedState: (typeof warehouseDemoStore.tables)[string] | undefined
): boolean {
  const state = resolveWarehouseTableState(tableKey, storedState, { isWarehouseView })

  if (state.mode !== 'has_warehouse_copy' || !state.copyStatus) return false

  const lagDisplay = projectReplication
    ? getReplicationLagDisplay(projectReplication, state.copyStatus)
    : null
  const linkedStatus = getWarehouseLinkedTableStatus(lagDisplay, state.copyStatus)

  if (!linkedStatus) return false
  if (linkedStatus.type === 'copy' && linkedStatus.copyStatus === 'live') return false

  return true
}

interface TableEditorDataSourceSuffixProps {
  schema: string
  table: string
}

export function TableEditorDataSourceSuffix({ schema, table }: TableEditorDataSourceSuffixProps) {
  const warehouseSnap = useSnapshot(warehouseDemoStore)
  const projectReplication = useProjectReplication()

  if (isWarehouseSchema(schema)) {
    const tableKey = getSourceTableKey(schema, table)
    const showStatus = shouldShowWarehouseEditorStatus(
      tableKey,
      true,
      projectReplication,
      warehouseSnap.tables[tableKey]
    )

    return (
      <>
        <span className="mx-1.5">·</span>
        <span
          className={`inline-flex min-w-0 items-center gap-1 truncate ${footerTextSizeClassName}`}
        >
          <WarehouseStatusText
            text="Warehouse replica"
            tooltip={WAREHOUSE_TABLE_EDITOR_TOOLTIP}
            className={footerLabelClassName}
          />
          {showStatus ? (
            <>
              <span className="shrink-0 text-foreground-muted">·</span>
              <WarehouseLinkedTableStatus
                tableKey={tableKey}
                isWarehouseView
                className={footerTextSizeClassName}
                showLeadingIndicator={false}
              />
            </>
          ) : null}
        </span>
      </>
    )
  }

  const tableKey = getSourceTableKey(schema, table)
  const storedState = warehouseSnap.tables[tableKey]
  const state = resolveWarehouseTableState(tableKey, storedState, { isWarehouseView: false })

  if (state.mode !== 'has_warehouse_copy') {
    return null
  }

  const showStatus = shouldShowWarehouseEditorStatus(
    tableKey,
    false,
    projectReplication,
    storedState
  )

  return (
    <>
      <span className="mx-1.5">·</span>
      <span
        className={`inline-flex min-w-0 items-center gap-1 truncate ${footerTextSizeClassName}`}
      >
        <WarehouseStatusText
          text="Postgres (live)"
          tooltip="Live Postgres rows"
          className={footerLabelClassName}
        />
        {showStatus ? (
          <>
            <span className="shrink-0 text-foreground-muted">·</span>
            <WarehouseLinkedTableStatus
              tableKey={tableKey}
              isWarehouseView={false}
              className={footerTextSizeClassName}
              showLeadingIndicator={false}
            />
          </>
        ) : null}
      </span>
    </>
  )
}
