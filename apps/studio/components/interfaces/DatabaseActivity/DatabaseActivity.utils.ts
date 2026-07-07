import { formatDuration as formatQueryDuration } from '@/components/interfaces/QueryPerformance/QueryPerformance.utils'

export interface RawSession {
  pid: number
  role_name: string | null
  application_name: string | null
  state: string | null
  query: string | null
  wait_event_type: string | null
  wait_event: string | null
  xact_start: string | null
  query_start: string | null
  state_change: string | null
  blocked_by: number[] | null
}

export type SessionStatus = 'blocking' | 'waiting' | 'idle_in_txn' | 'active' | 'idle' | 'other'

export interface Session extends RawSession {
  blockingCount: number
  status: SessionStatus
  waitingOn: number | null
  durationMs: number | null
}

const STATUS_ORDER: Record<SessionStatus, number> = {
  blocking: 0,
  waiting: 1,
  idle_in_txn: 2,
  active: 3,
  idle: 4,
  other: 5,
}

const isIdleInTransaction = (state: string | null) =>
  state === 'idle in transaction' || state === 'idle in transaction (aborted)'

function parseTime(value: string | null): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

function computeDuration(session: RawSession, nowMs: number): number | null {
  if (session.state === 'active') {
    const start = parseTime(session.query_start)
    return start === null ? null : Math.max(0, nowMs - start)
  }
  if (isIdleInTransaction(session.state)) {
    const change = parseTime(session.state_change)
    return change === null ? null : Math.max(0, nowMs - change)
  }
  const start = parseTime(session.query_start)
  return start === null ? null : Math.max(0, nowMs - start)
}

/**
 * Enriches the raw pg_stat_activity snapshot with the derived triage state:
 * how many other sessions each pid is blocking, its triage status, what it is
 * waiting on, and a duration. Sorted blocking-first.
 */
export function deriveSessions(raw: RawSession[], nowMs: number): Session[] {
  const blockingCounts = new Map<number, number>()
  for (const row of raw) {
    for (const blockerPid of row.blocked_by ?? []) {
      blockingCounts.set(blockerPid, (blockingCounts.get(blockerPid) ?? 0) + 1)
    }
  }

  const sessions: Session[] = raw.map((row) => {
    const blockingCount = blockingCounts.get(row.pid) ?? 0
    const blockedBy = row.blocked_by ?? []

    let status: SessionStatus
    if (blockingCount > 0) status = 'blocking'
    else if (blockedBy.length > 0) status = 'waiting'
    else if (isIdleInTransaction(row.state)) status = 'idle_in_txn'
    else if (row.state === 'active') status = 'active'
    else if (row.state === 'idle') status = 'idle'
    else status = 'other'

    return {
      ...row,
      blockingCount,
      status,
      waitingOn: blockedBy.length > 0 ? blockedBy[0] : null,
      durationMs: computeDuration(row, nowMs),
    }
  })

  return sessions.sort((a, b) => {
    const orderDelta = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (orderDelta !== 0) return orderDelta
    return (b.durationMs ?? 0) - (a.durationMs ?? 0)
  })
}

export interface Rollups {
  connectionsUsed: number
  active: number
  idleInTransaction: number
  blocked: number
}

export function computeRollups(sessions: Session[]): Rollups {
  return {
    connectionsUsed: sessions.length,
    active: sessions.filter((s) => s.state === 'active').length,
    idleInTransaction: sessions.filter((s) => isIdleInTransaction(s.state)).length,
    blocked: sessions.filter((s) => (s.blocked_by ?? []).length > 0).length,
  }
}

export interface BlockingSummary {
  hasBlocking: boolean
  blockerCount: number
  blockedCount: number
  rootDurationMs: number | null
  rootQuery: string | null
}

/**
 * A blocking "root" is a session that blocks others but is not itself blocked.
 * The banner headlines the longest-running root.
 */
export function computeBlockingSummary(sessions: Session[]): BlockingSummary {
  const roots = sessions.filter((s) => s.blockingCount > 0 && (s.blocked_by ?? []).length === 0)
  const blockedCount = sessions.filter((s) => (s.blocked_by ?? []).length > 0).length

  if (roots.length === 0 || blockedCount === 0) {
    return {
      hasBlocking: false,
      blockerCount: 0,
      blockedCount: 0,
      rootDurationMs: null,
      rootQuery: null,
    }
  }

  const longestRoot = roots.reduce((longest, current) =>
    (current.durationMs ?? 0) > (longest.durationMs ?? 0) ? current : longest
  )

  return {
    hasBlocking: true,
    blockerCount: roots.length,
    blockedCount,
    rootDurationMs: longestRoot.durationMs,
    rootQuery: longestRoot.query,
  }
}

/** Distinct, sorted role names present in the current snapshot. */
export function distinctRoles(raw: RawSession[]): string[] {
  const roles = new Set<string>()
  for (const row of raw) {
    if (row.role_name) roles.add(row.role_name)
  }
  return Array.from(roles).sort()
}

export function roleAppLabel(session: Pick<RawSession, 'role_name' | 'application_name'>): string {
  const role = session.role_name ?? 'unknown'
  const app = session.application_name?.trim()
  return app ? `${role} · ${app}` : role
}

/**
 * Human-readable duration, delegating to the shared query-timing formatter used
 * by Query Performance / Query Insights (e.g. "0.40s", "2m 5s", "1h 1m", "28d 3h 2m").
 */
export function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '—'
  return formatQueryDuration(ms)
}

export const pluralize = (count: number, singular: string, plural?: string) =>
  count === 1 ? singular : (plural ?? `${singular}s`)
