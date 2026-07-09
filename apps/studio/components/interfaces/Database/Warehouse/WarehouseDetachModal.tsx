import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogSection,
  DialogTitle,
} from 'ui'

import { clearTableMode } from './warehouseDemoStore'
import { WarehouseProgressSteps } from './WarehouseProgressSteps'

const DETACH_PROGRESS = ['Stopping replication', 'Removing Warehouse replica']
const STEP_INTERVAL_MS = 1200
const COMPLETION_HOLD_MS = 650

interface WarehouseDetachModalProps {
  open: boolean
  tableKey: string
  copyName: string
  onOpenChange: (open: boolean) => void
}

export function WarehouseDetachModal({
  open,
  tableKey,
  copyName,
  onOpenChange,
}: WarehouseDetachModalProps) {
  const [progressIndex, setProgressIndex] = useState(0)

  useEffect(() => {
    if (!open) {
      setProgressIndex(0)
      return
    }

    if (progressIndex >= DETACH_PROGRESS.length) {
      const timeout = setTimeout(() => {
        clearTableMode(tableKey)
        toast.success('Stopped replicating to Warehouse')
        onOpenChange(false)
      }, COMPLETION_HOLD_MS)
      return () => clearTimeout(timeout)
    }

    const timeout = setTimeout(() => setProgressIndex((index) => index + 1), STEP_INTERVAL_MS)
    return () => clearTimeout(timeout)
  }, [open, progressIndex, tableKey, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent hideClose>
        <DialogHeader>
          <DialogTitle>Stopping replication</DialogTitle>
          <DialogDescription>
            Removing the Warehouse replica <code className="text-code-inline">{copyName}</code>.
            Your data in Postgres is unaffected.
          </DialogDescription>
        </DialogHeader>
        <DialogSection>
          <WarehouseProgressSteps
            steps={DETACH_PROGRESS}
            activeIndex={progressIndex}
            showProgressHeader
          />
        </DialogSection>
      </DialogContent>
    </Dialog>
  )
}
