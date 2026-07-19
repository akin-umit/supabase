import { useParams } from 'common'
import {
  Activity,
  Archive,
  CheckCircle2,
  Cpu,
  Database,
  GitCommitHorizontal,
  Server,
  Workflow,
  XCircle,
} from 'lucide-react'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Skeleton,
} from 'ui'

import { SingleStat } from '@/components/ui/SingleStat'
import { useProjectOperationsQuery } from '@/data/operations/project-operations-query'
import type { ProjectOperations } from '@/lib/api/self-hosted/project-operations'

type SummaryState = 'healthy' | 'degraded' | 'unknown' | 'unavailable'

const SERVICE_LABELS: Record<string, string> = {
  auth: 'Auth',
  database: 'Database',
  db: 'Database',
  functions: 'Edge Functions',
  gotrue: 'Auth',
  kong: 'API Gateway',
  logflare: 'Analytics',
  postgres: 'Postgres',
  postgrest: 'PostgREST',
  realtime: 'Realtime',
  rest: 'PostgREST',
  storage: 'Storage',
  vector: 'Vector',
}

const STATE_LABELS: Record<SummaryState, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  unknown: 'Unknown',
  unavailable: 'Unavailable',
}

const STATE_VARIANTS: Record<SummaryState, 'success' | 'warning' | 'default'> = {
  healthy: 'success',
  degraded: 'warning',
  unknown: 'default',
  unavailable: 'default',
}

function normalizeState(value?: string): SummaryState {
  if (!value) return 'unknown'
  const state = value.toLowerCase()
  if (['healthy', 'running', 'verified', 'applied', 'success'].includes(state)) return 'healthy'
  if (['degraded', 'unhealthy', 'failed', 'error', 'warning'].includes(state)) return 'degraded'
  if (['stopped', 'unavailable'].includes(state)) return 'unavailable'
  return 'unknown'
}

function normalizeServiceStatus(status: ProjectOperations['services'][string]): SummaryState {
  return normalizeState(status)
}

function formatTimestamp(value?: string) {
  if (!value) return undefined
  return new Date(value).toLocaleString()
}

function formatServiceName(name: string) {
  const normalized = name.trim().toLowerCase()
  if (SERVICE_LABELS[normalized]) return SERVICE_LABELS[normalized]

  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim()
}

function formatDatabaseEndpoint(data?: ProjectOperations) {
  const database = data?.infrastructure?.database
  if (!database) return 'Awaiting evidence'

  const host = database.host.trim()
  try {
    const url = new URL(host)
    return `${url.hostname}:${url.port || database.port}`
  } catch {
    if (host.includes('@') || host.includes('/')) return `Configured host:${database.port}`
    return `${host}:${database.port}`
  }
}

function getServiceRows(data?: ProjectOperations) {
  return Object.entries(data?.services ?? {})
    .map(([name, status]) => ({
      name,
      label: formatServiceName(name),
      state: normalizeServiceStatus(status),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function getOverallState(data?: ProjectOperations): SummaryState {
  if (!data) return 'unknown'
  return normalizeState(data.status)
}

function SelfHostedStatusStat({ data }: { data?: ProjectOperations }) {
  const services = getServiceRows(data)
  const state = getOverallState(data)
  const serviceCount = services.length
  const healthyCount = services.filter((service) => service.state === 'healthy').length
  const statusDots =
    services.length > 0
      ? services.slice(0, 9).map((service) => ({
          key: service.name,
          state: service.state,
          isPlaceholder: false,
        }))
      : Array.from({ length: 6 }, (_, index) => ({
          key: `placeholder-${index}`,
          state: 'unknown' as SummaryState,
          isPlaceholder: true,
        }))

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger tabIndex={0}>
        <SingleStat
          icon={
            <div className="grid grid-cols-3 gap-1">
              {statusDots.map((service) => (
                <div
                  key={service.key}
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    service.isPlaceholder
                      ? 'bg-foreground-lighter'
                      : service.state === 'healthy'
                        ? 'bg-brand'
                        : 'bg-selection'
                  )}
                />
              ))}
            </div>
          }
          label={<span>Status</span>}
          value={<span>{STATE_LABELS[state]}</span>}
        />
      </HoverCardTrigger>
      <HoverCardContent className="w-72 p-0" side="bottom" align="start">
        <div className="border-b px-3 py-2 text-xs">
          <p className="text-foreground">Self-hosted service health</p>
          <p className="text-foreground-light">
            {serviceCount > 0
              ? `${healthyCount}/${serviceCount} reported services are healthy.`
              : 'Waiting for management evidence.'}
          </p>
        </div>
        {services.length === 0 ? (
          <div className="px-3 py-2 text-xs text-foreground-light">
            No service evidence reported.
          </div>
        ) : (
          <div className="max-h-72 overflow-auto">
            {services.map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between border-b px-3 py-2 text-xs last:border-b-0"
              >
                <span className="text-foreground">{service.label}</span>
                <span className="flex items-center gap-1.5 text-foreground-light">
                  {service.state === 'healthy' ? (
                    <CheckCircle2 size={14} strokeWidth={1.5} className="text-brand" />
                  ) : (
                    <XCircle size={14} strokeWidth={1.5} className="text-foreground-light" />
                  )}
                  {STATE_LABELS[service.state]}
                </span>
              </div>
            ))}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  )
}

export function SelfHostedActivityStats() {
  const { ref: projectRef } = useParams()
  const { data, isPending } = useProjectOperationsQuery({ projectRef })

  const backupLabel = data?.backup.lastVerifiedAt
    ? formatTimestamp(data.backup.lastVerifiedAt)
    : data?.backup.status === 'verified'
      ? 'Verified'
      : 'Awaiting evidence'
  const migrationLabel =
    data?.migration.lastApplied ??
    formatTimestamp(data?.migration.appliedAt) ??
    (data?.migration.status === 'applied' ? 'Applied' : 'Awaiting evidence')
  const deployedCommit =
    data?.deployment.commit && data.deployment.commit !== 'unknown'
      ? data.deployment.commit
      : 'Unknown'

  return (
    <div className="@container">
      <div className="grid grid-cols-1 @md:grid-cols-2 gap-2 @md:gap-6 flex-wrap">
        <SelfHostedStatusStat data={data} />
        <SingleStat
          icon={<Cpu size={18} strokeWidth={1.5} className="text-foreground" />}
          label={<span>Compute</span>}
          value={
            isPending ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <Badge variant="default">Self-hosted</Badge>
            )
          }
        />
        <SingleStat
          icon={<GitCommitHorizontal size={18} strokeWidth={1.5} className="text-foreground" />}
          label={<span>Deployed commit</span>}
          value={
            isPending ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <p
                className={cn(
                  'truncate font-mono',
                  deployedCommit === 'Unknown' && 'text-foreground-lighter'
                )}
              >
                {deployedCommit}
              </p>
            )
          }
        />
        <SingleStat
          icon={<Workflow size={18} strokeWidth={1.5} className="text-foreground" />}
          label={<span>Applied migration</span>}
          value={
            isPending ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <p className="truncate text-foreground-lighter" title={migrationLabel}>
                {migrationLabel}
              </p>
            )
          }
        />
        <SingleStat
          icon={<Archive size={18} strokeWidth={1.5} className="text-foreground" />}
          label={<span>Verified backup</span>}
          value={
            isPending ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <p className="truncate text-foreground-lighter" title={backupLabel}>
                {backupLabel}
              </p>
            )
          }
        />
      </div>
    </div>
  )
}

export function SelfHostedInfrastructureDiagram() {
  const { ref: projectRef } = useParams()
  const { data, isPending } = useProjectOperationsQuery({ projectRef })
  const state = getOverallState(data)
  const services = getServiceRows(data)
  const healthyCount = services.filter((service) => service.state === 'healthy').length
  const maxConnections = data?.infrastructure?.database.maxClientConnections

  return (
    <Card className="h-[400px] md:h-[500px] overflow-hidden bg-transparent">
      <CardContent className="relative flex h-full items-center justify-center p-6">
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:18px_18px]" />
        <div className="relative w-full max-w-md rounded-md border bg-surface-100 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 border-b">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-brand-200 p-2 text-brand">
                <Database size={18} strokeWidth={1.5} />
              </div>
              <div>
                <CardTitle className="text-sm">Primary Database</CardTitle>
                <p className="text-xs text-foreground-light">{formatDatabaseEndpoint(data)}</p>
              </div>
            </div>
            <Badge variant={STATE_VARIANTS[state]}>{STATE_LABELS[state]}</Badge>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            {isPending ? (
              <>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-foreground-light">Services</p>
                    <p className="font-mono text-foreground">
                      {healthyCount}/{services.length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-foreground-light">Pooler</p>
                    <p className="font-mono text-foreground">
                      {maxConnections ? `${maxConnections} max` : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-foreground-light">Version</p>
                    <p className="truncate font-mono text-foreground">
                      {data?.deployment.version ?? 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {services.slice(0, 8).map((service) => (
                    <div
                      key={service.name}
                      className="flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-xs"
                    >
                      <span className="truncate text-foreground">{service.label}</span>
                      <span
                        className={cn(
                          'h-1.5 w-1.5 shrink-0 rounded-full',
                          service.state === 'healthy' ? 'bg-brand' : 'bg-selection'
                        )}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </div>
        <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs text-foreground-light">
          <Server size={14} strokeWidth={1.5} />
          Self-hosted evidence view
        </div>
        <div className="absolute bottom-4 right-4 flex items-center gap-2 text-xs text-foreground-light">
          <Activity size={14} strokeWidth={1.5} />
          Read-only
        </div>
      </CardContent>
    </Card>
  )
}
