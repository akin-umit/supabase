import { useParams } from 'common'
import { Activity, ArchiveRestore, GitCommitHorizontal, Workflow } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from 'ui'

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
        <div>
          <h2 id="self-hosted-operations-title">Operational evidence</h2>
          <p className="text-sm text-foreground-light">
            Deployment, backup and migration proof. Live service health is summarized above.
          </p>
        </div>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card, index) => (
              <Card key={card?.title ?? index} className="min-h-32 bg-transparent">
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
