import { literal, safeSql } from '@supabase/pg-meta'
import { AlertTriangle, Check, ChevronDown, Lock, Pause, Play } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  Card,
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'ui'
import {
  MetricCard,
  MetricCardContent,
  MetricCardHeader,
  MetricCardLabel,
  MetricCardValue,
} from 'ui-patterns/MetricCard'

import {
  computeBlockingSummary,
  computeRollups,
  deriveSessions,
  distinctRoles,
  formatDuration,
  pluralize,
  roleAppLabel,
  type Session,
  type SessionStatus,
} from './DatabaseActivity.utils'
import { TerminateConnectionModal } from './TerminateConnectionModal'
import { useDatabaseActivityQuery, useMaxConnectionsQuery } from './useDatabaseActivity'
import ReportPadding from '@/components/interfaces/Reports/ReportPadding'
import { useReadReplicasQuery } from '@/data/read-replicas/replicas-query'
import { useExecuteSqlMutation } from '@/data/sql/execute-sql-mutation'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'
import { IS_PLATFORM } from '@/lib/constants'

export const DatabaseActivity = () => {
  const { data: project } = useSelectedProjectQuery()
  const { data: databases } = useReadReplicasQuery({ projectRef: project?.ref })
  const primaryDatabase = (databases ?? []).find((db) => db.identifier === project?.ref)
  const connectionString = primaryDatabase?.connectionString

  const [isPaused, setIsPaused] = useState(false)
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [terminateTarget, setTerminateTarget] = useState<Session | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  // Live clock so durations tick between the 5s polls.
  useEffect(() => {
    if (isPaused) return
    const interval = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [isPaused])

  const {
    data: rawSessions,
    isPending,
    isError,
    dataUpdatedAt,
    refetch,
  } = useDatabaseActivityQuery(
    { projectRef: project?.ref, connectionString },
    { enabled: !IS_PLATFORM || connectionString !== undefined, isPaused }
  )

  const { data: maxConnections } = useMaxConnectionsQuery({
    projectRef: project?.ref,
    connectionString,
  })

  const { mutate: executeSql, isPending: isTerminating } = useExecuteSqlMutation({
    onSuccess: () => {
      toast.success(`Terminated connection ${terminateTarget?.pid}`)
      setTerminateTarget(null)
      refetch()
    },
    onError: (error) => {
      toast.error(`Failed to terminate connection: ${error.message}`)
    },
  })

  const sessions = useMemo(() => deriveSessions(rawSessions ?? [], nowMs), [rawSessions, nowMs])
  const rollups = useMemo(() => computeRollups(sessions), [sessions])
  const blocking = useMemo(() => computeBlockingSummary(sessions), [sessions])
  const roles = useMemo(() => distinctRoles(rawSessions ?? []), [rawSessions])

  const visibleSessions = useMemo(
    () => (roleFilter === null ? sessions : sessions.filter((s) => s.role_name === roleFilter)),
    [sessions, roleFilter]
  )

  const secondsSinceUpdate = Math.max(0, Math.round((nowMs - dataUpdatedAt) / 1000))
  const showStaleBanner = isError && (rawSessions?.length ?? 0) > 0

  const onConfirmTerminate = () => {
    if (!terminateTarget || !project?.ref) return
    executeSql({
      projectRef: project.ref,
      connectionString,
      sql: safeSql`select pg_terminate_backend(${literal(terminateTarget.pid)});`,
    })
  }

  if (isPending && !rawSessions) {
    return (
      <ReportPadding>
        <div className="flex h-full items-center justify-center text-sm text-foreground-light">
          Loading database activity…
        </div>
      </ReportPadding>
    )
  }

  return (
    <ReportPadding>
      {/* 1. Header row */}
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1>Database Activity</h1>
          {isPaused ? (
            <Badge variant="default">Paused</Badge>
          ) : (
            <Badge variant="success">
              <span className="size-1.5 rounded-full bg-brand" />
              <span>
                Live · <span className="normal-case">5s</span>
              </span>
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isPaused ? 'primary' : 'default'}
            icon={isPaused ? <Play /> : <Pause />}
            onClick={() => setIsPaused((prev) => !prev)}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <RoleSelector roles={roles} value={roleFilter} onChange={setRoleFilter} />
        </div>
      </div>

      <div className="mt-8 space-y-12">
        {/* 2. Vitals */}
        <div>
          <h2 className="mb-4">Vitals</h2>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <MetricCard>
              <MetricCardHeader>
                <MetricCardLabel>Connections</MetricCardLabel>
              </MetricCardHeader>
              <MetricCardContent>
                <MetricCardValue>
                  {rollups.connectionsUsed} / {maxConnections ?? '—'}
                </MetricCardValue>
              </MetricCardContent>
            </MetricCard>

            <MetricCard>
              <MetricCardHeader>
                <MetricCardLabel>Active</MetricCardLabel>
              </MetricCardHeader>
              <MetricCardContent>
                <MetricCardValue>{rollups.active}</MetricCardValue>
              </MetricCardContent>
            </MetricCard>

            <MetricCard>
              <MetricCardHeader>
                <MetricCardLabel tooltip="Sessions holding an open transaction while idle. These pin locks and hold back vacuum — watch them.">
                  Idle in transaction
                </MetricCardLabel>
              </MetricCardHeader>
              <MetricCardContent>
                <MetricCardValue>{rollups.idleInTransaction}</MetricCardValue>
              </MetricCardContent>
            </MetricCard>

            <MetricCard>
              <MetricCardHeader>
                <MetricCardLabel tooltip="Sessions waiting on a lock held by another session.">
                  Blocked queries
                </MetricCardLabel>
              </MetricCardHeader>
              <MetricCardContent>
                <MetricCardValue>{rollups.blocked}</MetricCardValue>
              </MetricCardContent>
            </MetricCard>
          </div>
        </div>

        {/* 3. Sessions */}
        <div>
          <h2 className="mb-4">Sessions</h2>
          <div className="space-y-4">
            {blocking.hasBlocking && (
              <div className="rounded-md border border-destructive bg-destructive-200 px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                      <Lock size={14} strokeWidth={2} className="shrink-0" />
                      {blocking.blockerCount} {pluralize(blocking.blockerCount, 'query', 'queries')}{' '}
                      {pluralize(blocking.blockerCount, 'is', 'are')} blocking{' '}
                      {blocking.blockedCount} {pluralize(blocking.blockedCount, 'other')} ·{' '}
                      {formatDuration(blocking.rootDurationMs)}
                    </p>
                    <p className="mt-1 truncate font-mono text-xs text-destructive/80">
                      {blocking.rootQuery?.trim() || '—'}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="tiny"
                    className="shrink-0"
                    onClick={() => console.log('View chain', blocking)}
                  >
                    View chain
                  </Button>
                </div>
              </div>
            )}

            {/* Stale / degraded banner */}
            {showStaleBanner && (
              <div className="flex items-center gap-2 rounded-md border border-warning bg-warning-200 px-4 py-2 text-sm text-warning-600">
                <AlertTriangle size={14} className="shrink-0" strokeWidth={2} />
                Stale — last updated {secondsSinceUpdate}s ago. Retrying…
              </div>
            )}

            {/* 4. Sessions table */}
            <Card className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PID</TableHead>
                    <TableHead>Role / app</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Query</TableHead>
                    <TableHead className="w-28 text-right">Duration</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleSessions.map((session) => (
                    <SessionRow
                      key={session.pid}
                      session={session}
                      onTerminate={() => setTerminateTarget(session)}
                    />
                  ))}
                  {visibleSessions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <p className="text-sm text-foreground">No sessions to display</p>
                        <p className="text-sm text-foreground-lighter">
                          No connections match the current filter
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      </div>

      <TerminateConnectionModal
        session={terminateTarget}
        loading={isTerminating}
        onConfirm={onConfirmTerminate}
        onCancel={() => setTerminateTarget(null)}
      />
    </ReportPadding>
  )
}

interface RoleSelectorProps {
  roles: string[]
  value: string | null
  onChange: (role: string | null) => void
}

const RoleSelector = ({ roles, value, onChange }: RoleSelectorProps) => {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <div className="flex cursor-pointer">
          <span className="flex items-center rounded-lg rounded-r-none border border-button border-r-0 px-3 text-xs text-foreground-lighter">
            Role
          </span>
          <Button
            variant="default"
            iconRight={<ChevronDown strokeWidth={1.5} size={12} />}
            className="justify-start rounded-l-none"
          >
            {value ?? 'All roles'}
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" side="bottom" align="end">
        <Command>
          <CommandList>
            <CommandGroup>
              <CommandItem
                className="w-full cursor-pointer"
                onSelect={() => {
                  onChange(null)
                  setOpen(false)
                }}
              >
                <div className="flex w-full items-center justify-between">
                  <p>All roles</p>
                  {value === null && <Check size={16} />}
                </div>
              </CommandItem>
              {roles.map((role) => (
                <CommandItem
                  key={role}
                  value={role}
                  className="w-full cursor-pointer"
                  onSelect={() => {
                    onChange(role)
                    setOpen(false)
                  }}
                >
                  <div className="flex w-full items-center justify-between">
                    <p>{role}</p>
                    {value === role && <Check size={16} />}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

interface SessionRowProps {
  session: Session
  onTerminate: () => void
}

const SessionRow = ({ session, onTerminate }: SessionRowProps) => {
  return (
    <TableRow>
      <TableCell className="font-mono text-foreground-light">{session.pid}</TableCell>
      <TableCell>
        {session.role_name || session.application_name?.trim() ? (
          roleAppLabel(session)
        ) : (
          <EmptyValue />
        )}
      </TableCell>
      <TableCell>
        <StateBadge session={session} />
      </TableCell>
      <TableCell className="max-w-0">
        {session.query?.trim() ? (
          <HoverCard openDelay={150} closeDelay={0}>
            <HoverCardTrigger asChild>
              <p className="cursor-default truncate font-mono text-xs">{session.query.trim()}</p>
            </HoverCardTrigger>
            <HoverCardContent align="center" className="max-h-80 w-80 overflow-auto p-3">
              <p className="whitespace-pre-wrap wrap-break-word font-mono text-xs">
                {session.query.trim()}
              </p>
            </HoverCardContent>
          </HoverCard>
        ) : (
          <EmptyValue />
        )}
      </TableCell>
      <TableCell className="w-28 text-right tabular-nums">
        {session.durationMs === null ? (
          <EmptyValue />
        ) : (
          <span className="block truncate">{formatDuration(session.durationMs)}</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button variant="default" size="tiny" onClick={onTerminate}>
          Kill
        </Button>
      </TableCell>
    </TableRow>
  )
}

const StateBadge = ({ session }: { session: Session }) => {
  const status: SessionStatus = session.status
  switch (status) {
    case 'blocking':
      return (
        <Badge variant="destructive" className="border border-destructive-400">
          Blocking {session.blockingCount}
        </Badge>
      )
    case 'waiting':
      return <Badge variant="default">Waiting on {session.waitingOn}</Badge>
    case 'idle_in_txn':
      return <Badge variant="warning">Idle in txn</Badge>
    case 'active':
      return <Badge variant="success">Active</Badge>
    case 'idle':
      return <Badge variant="default">Idle</Badge>
    default:
      return session.state ? <Badge variant="default">{session.state}</Badge> : <EmptyValue />
  }
}

const EmptyValue = () => <span className="text-foreground-muted">—</span>
