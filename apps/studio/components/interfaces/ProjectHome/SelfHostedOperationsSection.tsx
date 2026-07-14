import { useParams } from 'common'
import {
  Activity,
  ArchiveRestore,
  CheckCircle2,
  GitCommitHorizontal,
  Server,
  Workflow,
  XCircle,
} from 'lucide-react'
import type { ReactNode } from 'react'
import {
  Badge,
  Button,
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

import { useProjectOperationsQuery } from '@/data/operations/project-operations-query'
import type { ProjectOperations } from '@/lib/api/self-hosted/project-operations'

type OperationState = 'healthy' | 'degraded' | 'unknown' | 'unavailable'

type OperationCard = {
  title: string
  value: string
  detail: string
  state: OperationState
  icon: ReactNode
}

const STATE_LABELS: Record<OperationState, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  unknown: 'Unknown',
  unavailable: 'Unavailable',
}

const STATE_VARIANTS: Record<OperationState, 'success' | 'warning' | 'default'> = {
  healthy: 'success',
  degraded: 'warning',
  unknown: 'default',
  unavailable: 'default',
}

const SERVICE_LABELS: Record<string, string> = {
  auth: 'Auth',
  database: 'Database',
  db: 'Database',
  functions: 'Edge Functions',
  gotrue: 'Auth',
  kong: 'API Gateway',
  logflare: 'Logflare',
  postgres: 'Postgres',
  postgrest: 'PostgREST',
  realtime: 'Realtime',
  rest: 'PostgREST',
  storage: 'Storage',
}

function normalizeState(value: string | undefined, available = true): OperationState {
  if (!available) return 'unavailable'
  if (!value) return 'unknown'

  const state = value.toLowerCase()
  if (['healthy', 'running', 'verified', 'applied', 'success'].includes(state)) return 'healthy'
  if (['degraded', 'unhealthy', 'failed', 'error', 'warning'].includes(state)) return 'degraded'
  if (['stopped', 'unavailable'].includes(state)) return 'unavailable'
  return 'unknown'
}

function formatTimestamp(value: string) {
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

function formatDatabaseEndpoint(host: string, port: number) {
  const trimmedHost = host.trim()

  try {
    const url = new URL(trimmedHost)
    return `${url.hostname}:${url.port || port}`
  } catch {
    if (trimmedHost.includes('@') || trimmedHost.includes('/')) return `Configured host:${port}`
    return `${trimmedHost}:${port}`
  }
}

function getInfrastructureState(data: ProjectOperations): OperationState {
  const infrastructure = data.infrastructure
  if (!infrastructure) return 'unavailable'
  if (infrastructure.services.total === 0) return 'unknown'
  if (infrastructure.services.unavailable > 0) return 'degraded'
  return 'healthy'
}

function getCards(data: ProjectOperations): OperationCard[] {
  const failedServices = Object.entries(data.services)
    .filter(([, status]) => status !== 'healthy')
    .map(([name]) => formatServiceName(name))

  const deploymentAvailable = data.deployment.commit !== 'unknown'
  const backupAvailable = data.backup.status === 'verified' && Boolean(data.backup.lastVerifiedAt)
  const migrationAvailable =
    data.migration.status === 'applied' &&
    Boolean(data.migration.lastApplied || data.migration.appliedAt)

  return [
    {
      title: 'Service health',
      value: STATE_LABELS[normalizeState(data.status)],
      detail:
        failedServices.length > 0
          ? `Needs attention: ${failedServices.join(', ')}`
          : `Checked ${formatTimestamp(data.generatedAt)}`,
      state: normalizeState(data.status),
      icon: <Activity size={18} strokeWidth={1.5} />,
    },
    {
      title: 'Deployed commit',
      value: deploymentAvailable ? data.deployment.commit : 'Unknown',
      detail: `Version ${data.deployment.version}`,
      state: deploymentAvailable ? 'healthy' : 'unknown',
      icon: <GitCommitHorizontal size={18} strokeWidth={1.5} />,
    },
    {
      title: 'Verified backup',
      value: data.backup.lastVerifiedAt
        ? formatTimestamp(data.backup.lastVerifiedAt)
        : 'Awaiting evidence',
      detail: backupAvailable
        ? 'Latest verified recovery point'
        : 'No verified recovery point has been published by the operator.',
      state: normalizeState(data.backup.status, backupAvailable),
      icon: <ArchiveRestore size={18} strokeWidth={1.5} />,
    },
    {
      title: 'Applied migration',
      value:
        data.migration.lastApplied ??
        (data.migration.appliedAt
          ? formatTimestamp(data.migration.appliedAt)
          : 'Awaiting evidence'),
      detail:
        data.migration.lastApplied && data.migration.appliedAt
          ? `Applied ${formatTimestamp(data.migration.appliedAt)}`
          : 'No applied migration evidence has been published by the operator.',
      state: normalizeState(data.migration.status, migrationAvailable),
      icon: <Workflow size={18} strokeWidth={1.5} />,
    },
  ]
}

function SelfHostedInfrastructureCard({ data }: { data: ProjectOperations }) {
  const infrastructure = data.infrastructure
  const state = getInfrastructureState(data)
  const serviceRows = Object.entries(data.services)
    .map(([name, status]) => ({
      name,
      label: formatServiceName(name),
      state: normalizeState(status),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const unavailableServices = serviceRows.filter((service) => service.state !== 'healthy')
  const databaseEndpoint = infrastructure
    ? formatDatabaseEndpoint(infrastructure.database.host, infrastructure.database.port)
    : 'Awaiting evidence'
  const healthyCount = infrastructure
    ? `${infrastructure.services.healthy}/${infrastructure.services.total}`
    : `${serviceRows.filter((service) => service.state === 'healthy').length}/${serviceRows.length}`
  const unavailableCount = infrastructure
    ? infrastructure.services.unavailable
    : unavailableServices.length
  const poolerDetail = infrastructure?.database.maxClientConnections
    ? `${infrastructure.database.maxClientConnections} max pooler connections`
    : 'Pooler limit not reported'
  const summary =
    state === 'healthy'
      ? 'All reported services are healthy.'
      : state === 'degraded'
        ? `${unavailableCount} service${unavailableCount === 1 ? ' needs' : 's need'} operator attention.`
        : state === 'unknown'
          ? 'Management summary did not report service totals.'
          : 'Management summary is not available.'

  return (
    <Card className="bg-transparent">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 border-b-0">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 text-foreground-light">
            <Server size={18} strokeWidth={1.5} />
          </div>
          <div>
            <CardTitle className="text-sm">Service / Infrastructure</CardTitle>
            <p className="mt-1 text-sm text-foreground-light">
              Self-hosted evidence from management services and operator checks.
            </p>
          </div>
        </div>
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <button type="button" className="rounded">
              <Badge variant={STATE_VARIANTS[state]}>{STATE_LABELS[state]}</Badge>
            </button>
          </HoverCardTrigger>
          <HoverCardContent side="bottom" align="end" className="w-72 p-0">
            <div className="border-b px-3 py-2 text-xs">
              <p className="text-foreground">Service health</p>
              <p className="text-foreground-light">{summary}</p>
            </div>
            <div className="max-h-72 overflow-auto">
              {serviceRows.map((service) => (
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
          </HoverCardContent>
        </HoverCard>
      </CardHeader>
      <CardContent className="grid gap-4 p-6 pt-2 md:grid-cols-[1.2fr_1fr]">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-foreground-light">Database</p>
            <p className="mt-1 break-words font-mono text-sm text-foreground">{databaseEndpoint}</p>
            <p className="mt-1 text-xs text-foreground-light">{poolerDetail}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-foreground-light">Healthy services</p>
            <p className="mt-1 text-sm text-foreground">{healthyCount}</p>
            <p className="mt-1 text-xs text-foreground-light">
              Reported by the management overview.
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-foreground-light">Attention</p>
            <p className="mt-1 text-sm text-foreground">{summary}</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {serviceRows.map((service) => (
            <div
              key={service.name}
              className="flex min-w-0 items-center justify-between gap-2 rounded border px-3 py-2 text-xs"
            >
              <span className="truncate text-foreground">{service.label}</span>
              <span className="flex shrink-0 items-center gap-1.5 text-foreground-light">
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    service.state === 'healthy' ? 'bg-brand' : 'bg-selection'
                  )}
                />
                {STATE_LABELS[service.state]}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function SelfHostedOperationsSection() {
  const { ref: projectRef } = useParams()
  const { data, isPending, isError, refetch, isFetching } = useProjectOperationsQuery({
    projectRef,
  })
  const cards: Array<OperationCard | null> = data
    ? getCards(data)
    : Array.from({ length: 4 }, () => null)

  return (
    <section aria-labelledby="self-hosted-operations-title">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id="self-hosted-operations-title">Operations</h2>
      </div>

      {isError ? (
        <Card className="bg-transparent">
          <CardContent className="flex min-h-32 flex-col items-start justify-center gap-3 p-6">
            <div>
              <p className="text-sm text-foreground">Operations data is unavailable</p>
              <p className="text-sm text-foreground-light">
                The latest status could not be loaded.
              </p>
            </div>
            <Button size="small" type="button" onClick={() => refetch()} loading={isFetching}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4" aria-busy={isPending}>
          {data ? (
            <SelfHostedInfrastructureCard data={data} />
          ) : (
            <Card className="bg-transparent">
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b-0">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-16" />
              </CardHeader>
              <CardContent className="grid gap-4 p-6 pt-2 md:grid-cols-[1.2fr_1fr]">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card, index) => (
              <Card key={card?.title ?? index} className="min-h-40 bg-transparent">
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b-0">
                  {card === null ? (
                    <>
                      <Skeleton className="h-5 w-28" />
                      <Skeleton className="h-5 w-16" />
                    </>
                  ) : (
                    <>
                      <div className="flex min-w-0 items-center gap-2 text-foreground-light">
                        {card.icon}
                        <CardTitle className="truncate text-sm">{card.title}</CardTitle>
                      </div>
                      <Badge variant={STATE_VARIANTS[card.state]}>{STATE_LABELS[card.state]}</Badge>
                    </>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col gap-2 p-6 pt-3">
                  {card === null ? (
                    <>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                    </>
                  ) : (
                    <>
                      <p className="break-words font-mono text-sm text-foreground">{card.value}</p>
                      <p className="text-sm text-foreground-light">{card.detail}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
