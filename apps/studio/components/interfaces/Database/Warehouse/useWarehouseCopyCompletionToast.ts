import { useParams } from 'common'
import { useRouter } from 'next/router'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useSnapshot } from 'valtio'

import type { CopyStatus } from './warehouseDemoStore'
import { warehouseDemoStore } from './warehouseDemoStore'
import { getWarehouseQualifiedTableName } from './warehouseNaming.utils'
import { WAREHOUSE_TABLE_DETAIL_VIEW } from './warehouseTableEditor.utils'

function getTableIdFromPath(path: string): number | undefined {
  const match = path.match(/\/database\/tables\/(\d+)/)
  if (!match) return undefined
  const id = Number(match[1])
  return Number.isFinite(id) ? id : undefined
}

export function shouldSuppressWarehouseCopyCompletionToast({
  sourceTableId,
  path,
  view,
}: {
  sourceTableId?: number
  path: string
  view?: string
}): boolean {
  if (sourceTableId === undefined) return false

  const routeTableId = getTableIdFromPath(path)
  if (routeTableId !== sourceTableId) return false

  if (view === WAREHOUSE_TABLE_DETAIL_VIEW) return true
  if (/\/database\/tables\/\d+\/settings$/.test(path)) return true

  return false
}

/**
 * When a table's Warehouse replica finishes replicating, toast unless the user is already on a
 * surface that shows completion (Settings or warehouse detail).
 */
export function useWarehouseCopyCompletionToast() {
  const router = useRouter()
  const { ref: projectRef } = useParams()
  const snap = useSnapshot(warehouseDemoStore)
  const prevCopyStatusRef = useRef<Record<string, CopyStatus | undefined>>({})

  useEffect(() => {
    if (projectRef === undefined) return

    const path = router.asPath.split('?')[0]
    const view = typeof router.query.view === 'string' ? router.query.view : undefined

    for (const [tableKey, state] of Object.entries(snap.tables)) {
      if (state.mode !== 'has_warehouse_copy') continue

      const copyStatus = state.copyStatus
      const previousCopyStatus = prevCopyStatusRef.current[tableKey]

      if (previousCopyStatus === 'backfilling' && copyStatus === 'live') {
        const sourceTableId = state.sourceTableId

        if (
          !shouldSuppressWarehouseCopyCompletionToast({
            sourceTableId,
            path,
            view,
          })
        ) {
          const qualifiedName = getWarehouseQualifiedTableName(tableKey)

          toast.success('Warehouse replica is live', {
            description: qualifiedName,
          })
        }
      }

      prevCopyStatusRef.current[tableKey] = copyStatus
    }
  }, [projectRef, router, snap.tables])
}
