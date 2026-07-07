import { RotateCcw, Unlock } from 'lucide-react'
import ConfirmationModal from 'ui-patterns/Dialogs/ConfirmationModal'

import { formatDuration, pluralize, type Session } from './DatabaseActivity.utils'

interface TerminateConnectionModalProps {
  session: Session | null
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const TerminateConnectionModal = ({
  session,
  loading,
  onConfirm,
  onCancel,
}: TerminateConnectionModalProps) => {
  const hasOpenTransaction = !!session?.xact_start
  const freesBlocked = (session?.blockingCount ?? 0) > 0

  return (
    <ConfirmationModal
      visible={session !== null}
      size="medium"
      variant="destructive"
      title={session ? `Terminate connection ${session.pid}?` : 'Terminate connection?'}
      confirmLabel="Terminate connection"
      confirmLabelLoading="Terminating"
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      {session && (
        <div className="flex flex-col gap-4 py-3 text-sm">
          <p className="text-foreground-light">
            The query stops immediately and its transaction rolls back.
          </p>

          <div className="max-h-40 overflow-auto rounded-md border bg-surface-200 px-3 py-2">
            <p className="whitespace-pre-wrap wrap-break-word font-mono text-xs text-foreground">
              {session.query?.trim() || '—'}
            </p>
          </div>

          <div className="divide-y rounded-md border">
            <MetaRow label="Role" value={session.role_name ?? '—'} />
            <MetaRow label="Application" value={session.application_name?.trim() || '—'} />
            <MetaRow label="State" value={session.state ?? '—'} />
            <MetaRow label="Running" value={formatDuration(session.durationMs)} />
          </div>

          {(freesBlocked || hasOpenTransaction) && (
            <ul className="flex flex-col gap-2">
              {freesBlocked && (
                <li className="flex items-center gap-2 text-foreground-light">
                  <Unlock size={14} className="text-warning shrink-0" strokeWidth={1.5} />
                  <span>
                    Frees {session.blockingCount} blocked{' '}
                    {pluralize(session.blockingCount, 'query', 'queries')} waiting on this lock
                  </span>
                </li>
              )}
              {hasOpenTransaction && (
                <li className="flex items-center gap-2 text-foreground-light">
                  <RotateCcw
                    size={14}
                    className="text-foreground-lighter shrink-0"
                    strokeWidth={1.5}
                  />
                  <span>Rolls back an open transaction</span>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </ConfirmationModal>
  )
}

const MetaRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-4 px-3 py-2">
    <span className="text-foreground-lighter">{label}</span>
    <span className="truncate text-right text-foreground" title={value}>
      {value}
    </span>
  </div>
)
