import { useParams } from 'common'
import { ArchiveRestore, DatabaseBackup, Download, Play, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button, Card, Input } from 'ui'

import {
  useSelfHostedManagementMutation,
  useSelfHostedManagementQuery,
} from '@/data/self-hosted/management'

type Backup = {
  id: string
  createdAt: string
  status: 'queued' | 'running' | 'verified' | 'failed'
  sizeBytes?: number
  checksum?: string
  downloadUrl?: string
  earliestRestoreAt?: string
  latestRestoreAt?: string
}
export type BackupResponse = {
  backups?: Backup[]
  schedule?: string
  configured?: boolean
  status?: 'configured' | 'operator_managed' | 'unsupported' | 'unavailable'
  message?: string
  pitr?: { enabled?: boolean }
}

const formatBytes = (value?: number) =>
  value === undefined ? 'Size pending' : `${(value / 1024 / 1024).toFixed(1)} MB`

export const formatManagementError = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Operation failed'
  if (message === 'upstream_operation_failed' || message.includes('upstream_operation_failed')) {
    return 'The self-hosted backup job runner rejected the operation. Check the VPS/Coolify backup worker and storage credentials, then retry.'
  }
  if (message.includes('Management API is not configured')) {
    return 'The self-hosted management API is not configured for backup operations.'
  }
  return message
}

export const isSelfHostedManagementUnavailable = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return (
    message.includes('Management API is not configured') ||
    message.includes('Unable to reach management API') ||
    message.includes('upstream_operation_failed')
  )
}

export const isBackupRuntimeConfigured = (data: BackupResponse | undefined) =>
  data?.configured === true

export function SelfHostedBackups({ mode }: { mode: 'scheduled' | 'pitr' | 'restore' }) {
  const { ref } = useParams()
  const [restoreAt, setRestoreAt] = useState('')
  const { data, isPending, error, refetch } = useSelfHostedManagementQuery<BackupResponse>({
    projectRef: ref,
    resource: mode === 'pitr' ? ['pitr'] : ['backups'],
  })
  const run = useSelfHostedManagementMutation<unknown, Record<string, unknown>>({
    projectRef: ref,
    resource: mode === 'pitr' ? ['pitr', 'restore'] : ['backups'],
  })
  const restore = useSelfHostedManagementMutation<unknown, { id: string; targetRef?: string }>({
    projectRef: ref,
    resource: (value) => ['backups', value.id, 'restore-to-new-project'],
  })
  const remove = useSelfHostedManagementMutation<unknown, { id: string }>({
    projectRef: ref,
    resource: (value) => ['backups', value.id],
    method: 'DELETE',
  })

  const act = async (promise: Promise<unknown>, message: string) => {
    try {
      await promise
      toast.success(message)
      await refetch()
    } catch (error) {
      toast.error(formatManagementError(error))
    }
  }

  if (error) {
    const description = isSelfHostedManagementUnavailable(error)
      ? formatManagementError(error)
      : error.message

    return (
      <Card className="p-6 space-y-3">
        <div className="flex items-start gap-3">
          <DatabaseBackup className="mt-0.5 text-warning" />
          <div className="space-y-2">
            <p className="text-sm font-medium">Backup runtime needs configuration</p>
            <p className="text-sm text-foreground-light">
              Studio can show and trigger backups when the self-host management API exposes local
              backup evidence and job controls.
            </p>
            <p className="text-xs text-foreground-lighter">{description}</p>
            <Button variant="default" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  if (mode === 'pitr') {
    const pitrEnabled = isBackupRuntimeConfigured(data) && data?.pitr?.enabled === true

    return (
      <Card className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg">Point-in-time recovery</h3>
            <p className="text-sm text-foreground-light">
              Restore the database from archived WAL to an exact timestamp.
            </p>
          </div>
          <span className="text-sm text-brand">{pitrEnabled ? 'Enabled' : 'Unavailable'}</span>
        </div>
        {!pitrEnabled && (
          <div className="rounded border border-warning/40 bg-warning-200 px-4 py-3 text-sm">
            PITR requires WAL archiving and a restore job runner in the self-hosted runtime. Studio
            will enable the restore form as soon as the management API reports PITR as configured.
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            type="datetime-local"
            value={restoreAt}
            onChange={(event) => setRestoreAt(event.target.value)}
            disabled={!pitrEnabled}
          />
          <Button
            icon={<ArchiveRestore />}
            disabled={!pitrEnabled || !restoreAt}
            loading={run.isPending}
            onClick={() =>
              act(
                run.mutateAsync({ targetTime: new Date(restoreAt).toISOString() }),
                'PITR restore queued'
              )
            }
          >
            Restore
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg">{mode === 'restore' ? 'Restore to new project' : 'Backups'}</h3>
          <p className="text-sm text-foreground-light">
            {isBackupRuntimeConfigured(data) && data?.schedule
              ? `Schedule: ${data.schedule}`
              : 'Verified database recovery points'}
          </p>
        </div>
        {mode === 'scheduled' && (
          <Button
            icon={<Play />}
            loading={run.isPending}
            disabled={!isBackupRuntimeConfigured(data)}
            onClick={() => act(run.mutateAsync({}), 'Backup job queued')}
          >
            Back up now
          </Button>
        )}
      </div>
      {isPending ? (
        <Card className="p-6 text-sm text-foreground-light">Loading backups...</Card>
      ) : !isBackupRuntimeConfigured(data) ? (
        <Card className="p-6 space-y-2 text-sm text-foreground-light">
          <p>Backup job runner is not configured.</p>
          <p>
            Configure the VPS backup schedule, storage target, and restore worker in the self-hosted
            runtime. Studio will enable backup actions when the management API reports this project
            as configured.
          </p>
          {data?.message && <p className="text-xs text-foreground-lighter">{data.message}</p>}
        </Card>
      ) : data?.backups?.length ? (
        data.backups.map((backup) => (
          <Card key={backup.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <DatabaseBackup className="text-foreground-light" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm truncate">{backup.id}</p>
              <p className="text-xs text-foreground-light">
                {new Date(backup.createdAt).toLocaleString()} · {formatBytes(backup.sizeBytes)} ·{' '}
                {backup.status}
              </p>
              {backup.checksum && (
                <p className="font-mono text-xs truncate">SHA256 {backup.checksum}</p>
              )}
            </div>
            <div className="flex gap-2">
              {backup.downloadUrl && (
                <Button asChild variant="default" icon={<Download />}>
                  <a href={backup.downloadUrl}>Download</a>
                </Button>
              )}
              <Button
                variant="default"
                icon={<ArchiveRestore />}
                onClick={() => {
                  const targetRef =
                    mode === 'restore' ? window.prompt('New project reference') : undefined
                  if (mode !== 'restore' || targetRef) {
                    act(
                      restore.mutateAsync({ id: backup.id, targetRef: targetRef || undefined }),
                      'Restore queued'
                    )
                  }
                }}
              >
                Restore
              </Button>
              {mode === 'scheduled' && (
                <Button
                  variant="default"
                  icon={<Trash2 />}
                  onClick={() => act(remove.mutateAsync({ id: backup.id }), 'Backup deleted')}
                >
                  Delete
                </Button>
              )}
            </div>
          </Card>
        ))
      ) : (
        <Card className="p-6 space-y-2 text-sm text-foreground-light">
          <p>No backups have been created yet.</p>
          <p>
            Configure the self-hosted backup job runner and storage target in your VPS runtime,
            then use Back up now to create the first recovery point.
          </p>
        </Card>
      )}
    </div>
  )
}
