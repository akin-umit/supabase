import { useParams } from 'common'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogSection,
  DialogSectionSeparator,
  DialogTitle,
} from 'ui'

import { setTableMode, warehouseDemoStore } from './warehouseDemoStore'
import { getWarehouseQualifiedTableName } from './warehouseNaming.utils'
import { buildReplicationLogsUrl } from './warehouseObservability.utils'

interface WarehouseEnablementModalProps {
  open: boolean
  tableKey: string
  sourceTableId: number
  onOpenChange: (open: boolean) => void
}

const SETUP_ERROR_MESSAGE =
  'Warehouse replication could not be enabled for this project. Your Postgres table was not changed.'

/** Simulates POST /platform/warehouse/{ref}/tables until Studio queries the platform API. */
const REPLICATE_REQUEST_MS = 900

export function WarehouseEnablementModal({
  open,
  tableKey,
  sourceTableId,
  onOpenChange,
}: WarehouseEnablementModalProps) {
  const { ref: projectRef } = useParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const warehouseQualifiedName = getWarehouseQualifiedTableName(tableKey)
  const replicationLogsUrl =
    projectRef !== undefined ? buildReplicationLogsUrl(projectRef) : undefined

  useEffect(() => {
    if (!open) {
      setIsSubmitting(false)
      setSubmitError(null)
    }
  }, [open])

  const startReplication = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          if (warehouseDemoStore.simulateNextLinkFailure) {
            warehouseDemoStore.simulateNextLinkFailure = false
            reject(new Error('replicate_failed'))
            return
          }
          resolve()
        }, REPLICATE_REQUEST_MS)
      })

      setTableMode(tableKey, 'has_warehouse_copy', { sourceTableId })
      toast.success('Warehouse replication started')
      onOpenChange(false)
    } catch {
      setSubmitError(SETUP_ERROR_MESSAGE)
      toast.error('Failed to replicate table to Warehouse')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val && !isSubmitting) onOpenChange(false)
      }}
    >
      <DialogContent size="small">
        <DialogHeader>
          <DialogTitle>Replicate table to Warehouse</DialogTitle>
        </DialogHeader>

        <DialogSectionSeparator />
        <DialogSection className="flex flex-col gap-4">
          <p className="text-sm text-foreground-light">
            The Postgres heap will remain the source of truth. A Warehouse replica will be created.
          </p>

          <div className="rounded-lg border bg-surface-75 text-sm">
            <div className="flex items-center justify-between gap-4 px-4 py-2.5">
              <span className="text-foreground-lighter">Postgres</span>
              <code className="text-code-inline">{tableKey}</code>
            </div>
            <div className="flex items-center justify-between gap-4 border-t px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-foreground-lighter">Warehouse</span>
                <Badge variant="success">New</Badge>
              </div>
              <code className="text-code-inline">{warehouseQualifiedName}</code>
            </div>
          </div>

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
        </DialogSection>

        <DialogFooter>
          {submitError && replicationLogsUrl && (
            <Button variant="default" asChild className="mr-auto">
              <Link href={replicationLogsUrl}>View logs</Link>
            </Button>
          )}
          <Button variant="default" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={isSubmitting} onClick={() => void startReplication()}>
            Replicate to Warehouse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
