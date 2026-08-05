import { useParams } from 'common'
import { CheckCircle2, Clock3, DatabaseBackup, GitCommitHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from 'ui'

import Panel from '@/components/ui/Panel'
import { useProjectOperationsQuery } from '@/data/operations/project-operations-query'

function formatTimestamp(value?: string) {
  if (!value) return 'Not published'

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value

  return date.toISOString().replace('T', ' ').replace('.000Z', ' UTC')
}

function StatusPill({ healthy, children }: { healthy: boolean; children: ReactNode }) {
  return (
    <span
      className={
        healthy
          ? 'inline-flex w-fit items-center rounded-full border border-brand-600/40 bg-brand-500/10 px-2 py-0.5 text-xs text-brand'
          : 'inline-flex w-fit items-center rounded-full border border-border-strong bg-surface-75 px-2 py-0.5 text-xs text-foreground-light'
      }
    >
      {children}
    </span>
  )
}

function EvidenceRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded border bg-surface-75 px-3 py-2">
      <div className="mt-0.5 text-foreground-light">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs uppercase text-foreground-lighter">{label}</p>
        <p className="truncate font-mono text-sm text-foreground" title={value}>
          {value}
        </p>
      </div>
    </div>
  )
}

export function SelfHostedBackupEvidence({ mode }: { mode: 'scheduled' | 'pitr' }) {
  const { ref: projectRef } = useParams()
  const { data, isPending, isError, refetch, isFetching } = useProjectOperationsQuery({
    projectRef,
  })

  if (isError) {
    return (
      <Panel>
        <Panel.Content>
          <div className="flex min-h-32 flex-col items-start justify-center gap-3">
            <div>
              <p className="text-sm text-foreground">Backup evidence is unavailable</p>
              <p className="text-sm text-foreground-light">
                The self-hosted management API could not return the current backup and migration
                status.
              </p>
            </div>
            <Button size="small" type="button" onClick={() => refetch()} loading={isFetching}>
              Retry
            </Button>
          </div>
        </Panel.Content>
      </Panel>
    )
  }

  const backupVerified = data?.backup.status === 'verified'
  const migrationApplied = data?.migration.status === 'applied'

  return (
    <div className="space-y-4" aria-busy={isPending}>
      <Panel>
        <Panel.Content>
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-base text-foreground">
                  {mode === 'pitr'
                    ? 'Point-in-time recovery evidence'
                    : 'Scheduled backup evidence'}
                </p>
                <p className="text-sm text-foreground-light">
                  Studio is reading the self-hosted management API. Recovery jobs publish their
                  verified status from the deployment runtime.
                </p>
              </div>
              <StatusPill healthy={backupVerified}>
                {isPending ? 'Loading' : backupVerified ? 'Verified' : 'Unavailable'}
              </StatusPill>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <EvidenceRow
                icon={<DatabaseBackup size={16} strokeWidth={1.5} />}
                label="Backup status"
                value={isPending ? 'Loading' : (data?.backup.status ?? 'unavailable')}
              />
              <EvidenceRow
                icon={<Clock3 size={16} strokeWidth={1.5} />}
                label="Last verified"
                value={isPending ? 'Loading' : formatTimestamp(data?.backup.lastVerifiedAt)}
              />
              <EvidenceRow
                icon={<GitCommitHorizontal size={16} strokeWidth={1.5} />}
                label="Last migration"
                value={isPending ? 'Loading' : (data?.migration.lastApplied ?? 'Not published')}
              />
              <EvidenceRow
                icon={<CheckCircle2 size={16} strokeWidth={1.5} />}
                label="Migration status"
                value={isPending ? 'Loading' : (data?.migration.status ?? 'unavailable')}
              />
            </div>

            <div className="rounded border bg-surface-75 px-3 py-2 text-sm text-foreground-light">
              {mode === 'pitr'
                ? migrationApplied
                  ? `Migration evidence was applied at ${formatTimestamp(data?.migration.appliedAt)}. Restore execution remains controlled by the deployment backup job.`
                  : 'Publish WAL archive and restore verification evidence from the backup job before exposing restore actions.'
                : backupVerified
                  ? `Backup verification was generated at ${formatTimestamp(data?.generatedAt)}.`
                  : 'Publish a verified backup status file from the backup job to make this page actionable.'}
            </div>
          </div>
        </Panel.Content>
      </Panel>
    </div>
  )
}
