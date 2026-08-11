import { useParams } from 'common'
import { AlertTriangle, CheckCircle2, Database, Plus, RadioTower, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge, Button, Card, Input } from 'ui'

import {
  useSelfHostedManagementMutation,
  useSelfHostedManagementQuery,
} from '@/data/self-hosted/management'

type PublicationTable = string | { schema?: string; name?: string }
type Publication = {
  name: string
  tables: PublicationTable[]
  allTables?: boolean
  all_tables?: boolean
}
type Slot = {
  name: string
  plugin: string
  active: boolean
  retainedBytes?: number
  retained_bytes?: number
}
type Destination = {
  id: string
  name: string
  type: string
  status: 'active' | 'paused' | 'failed' | 'configured'
  publication: string
  endpoint?: string
}
type ReplicationState = {
  walLevel?: string
  wal_level?: string
  configured?: boolean
  status?: 'configured' | 'operator_managed' | 'unsupported' | 'unavailable'
  message?: string
  publications?: Publication[]
  slots?: Slot[]
  destinations?: Destination[]
}
type NormalizedReplicationState = Omit<
  ReplicationState,
  'publications' | 'slots' | 'destinations'
> & {
  walLevel: string
  configured: boolean
  status: NonNullable<ReplicationState['status']>
  message: string
  publications: Array<Omit<Publication, 'tables'> & { tables: string[] }>
  slots: Array<Omit<Slot, 'retained_bytes'>>
  destinations: Destination[]
}

const tableLabel = (table: PublicationTable) => {
  if (typeof table === 'string') return table
  if (table.schema && table.name) return `${table.schema}.${table.name}`
  return table.name ?? table.schema ?? ''
}

const destinationStatuses = new Set<Destination['status']>([
  'active',
  'paused',
  'failed',
  'configured',
])

export function normalizeReplicationState(
  data: ReplicationState | undefined
): NormalizedReplicationState {
  const publications = Array.isArray(data?.publications)
    ? data.publications.map((item) => ({
        name: String(item?.name ?? 'unnamed_publication'),
        allTables: Boolean(item?.allTables ?? item?.all_tables),
        all_tables: Boolean(item?.allTables ?? item?.all_tables),
        tables: Array.isArray(item?.tables) ? item.tables.map(tableLabel).filter(Boolean) : [],
      }))
    : []

  const slots = Array.isArray(data?.slots)
    ? data.slots.map((slot) => ({
        name: String(slot?.name ?? 'unnamed_slot'),
        plugin: String(slot?.plugin ?? 'unknown'),
        active: Boolean(slot?.active),
        retainedBytes:
          typeof slot?.retainedBytes === 'number'
            ? slot.retainedBytes
            : typeof slot?.retained_bytes === 'number'
              ? slot.retained_bytes
              : undefined,
      }))
    : []

  const destinations = Array.isArray(data?.destinations)
    ? data.destinations.map((destination) => ({
        id: String(destination?.id ?? destination?.name ?? 'destination'),
        name: String(destination?.name ?? 'Unnamed destination'),
        type: String(destination?.type ?? 'postgres'),
        status: destinationStatuses.has(destination?.status) ? destination.status : 'paused',
        publication: String(destination?.publication ?? ''),
        endpoint: destination?.endpoint ? String(destination.endpoint) : undefined,
      }))
    : []

  return {
    walLevel: (data?.walLevel ?? data?.wal_level) ? String(data?.walLevel ?? data?.wal_level) : '',
    configured: data?.configured ?? true,
    status: data?.status ?? 'configured',
    message: data?.message ?? '',
    publications,
    slots,
    destinations,
  }
}

export function SelfHostedReplication() {
  const { ref } = useParams()
  const [name, setName] = useState('')
  const [publication, setPublication] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const { data, isPending, error, refetch } = useSelfHostedManagementQuery<ReplicationState>({
    projectRef: ref,
    resource: ['replication'],
  })
  const create = useSelfHostedManagementMutation<unknown, Record<string, unknown>>({
    projectRef: ref,
    resource: ['replication', 'destinations'],
  })
  const remove = useSelfHostedManagementMutation<unknown, { id: string }>({
    projectRef: ref,
    resource: (value) => ['replication', 'destinations', value.id],
    method: 'DELETE',
  })
  const replication = normalizeReplicationState(data)
  const hasLogicalWal = replication.walLevel === 'logical'
  const isUnavailable =
    replication.status === 'unsupported' ||
    replication.status === 'unavailable' ||
    replication.configured === false
  const publicationExists = replication.publications.some((item) => item.name === publication)

  const submit = async () => {
    try {
      await create.mutateAsync({ name, publication, endpoint, type: 'postgres' })
      setName('')
      setEndpoint('')
      setPublication('')
      toast.success('Replication destination created')
      await refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create destination')
    }
  }

  if (error) {
    return (
      <Card className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 text-warning" />
          <div className="space-y-2">
            <p className="text-sm font-medium">Replication is operator managed</p>
            <p className="text-sm text-foreground-light">
              Studio could not read the local replication backend. Configure the self-host
              management API replication endpoint on the VPS, then refresh this page.
            </p>
            <p className="text-xs text-foreground-lighter">{error.message}</p>
            <Button variant="default" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </div>
      </Card>
    )
  }
  if (isPending)
    return <Card className="p-6 text-sm text-foreground-light">Loading replication...</Card>

  return (
    <div className="space-y-6">
      {(isUnavailable || !hasLogicalWal) && (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 text-warning" />
            <div>
              <p className="text-sm font-medium">
                {isUnavailable
                  ? 'Replication backend is not fully configured'
                  : 'Logical replication is not active'}
              </p>
              <p className="text-sm text-foreground-light">
                {replication.message ||
                  (hasLogicalWal
                    ? 'The local management API reported replication as unavailable. Configure the VPS replication service, then refresh this page.'
                    : 'Set Postgres wal_level to logical and restart Postgres before creating logical destinations. Studio reads this value from the local replication backend.')}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Database />
            <h3 className="text-lg">Publications</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-foreground-light">
            <span>WAL level: {replication.walLevel || 'not reported by operator'}</span>
            {hasLogicalWal ? (
              <Badge variant="success">Logical</Badge>
            ) : (
              <Badge variant="warning">Requires logical</Badge>
            )}
          </div>
          {replication.publications.length ? (
            replication.publications.map((item) => (
              <div key={item.name} className="rounded border p-3">
                <p className="font-mono text-sm">{item.name}</p>
                <p className="text-xs text-foreground-light">
                  {item.allTables
                    ? 'All tables'
                    : item.tables.length > 0
                      ? item.tables.join(', ')
                      : 'No tables in this publication'}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-foreground-light">
              No logical publications reported. Create a publication from Database &gt; Publications
              or SQL Editor, then refresh this page.
            </p>
          )}
        </Card>
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <RadioTower />
            <h3 className="text-lg">Replication slots</h3>
          </div>
          {replication.slots.length ? (
            replication.slots.map((slot) => (
              <div key={slot.name} className="flex items-center justify-between rounded border p-3">
                <div>
                  <p className="font-mono text-sm">{slot.name}</p>
                  <p className="text-xs text-foreground-light">{slot.plugin}</p>
                </div>
                <span
                  className={slot.active ? 'text-brand text-sm' : 'text-foreground-light text-sm'}
                >
                  {slot.active ? 'Active' : 'Idle'}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-foreground-light">
              No logical replication slots reported by the local Postgres runtime.
            </p>
          )}
        </Card>
      </div>

      <Card className="p-5 space-y-4">
        <div>
          <h3 className="text-lg">Add destination</h3>
          <p className="text-sm text-foreground-light">
            Connect a logical publication to a PostgreSQL-compatible destination. Secrets are sent
            only on submit and are never refetched into the form.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="Destination name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Publication"
            value={publication}
            onChange={(e) => setPublication(e.target.value)}
          />
          <Input
            placeholder="postgresql://..."
            type="password"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
          />
        </div>
        <Button
          icon={<Plus />}
          loading={create.isPending}
          disabled={
            isUnavailable ||
            !hasLogicalWal ||
            !name ||
            !publication ||
            !endpoint ||
            !publicationExists
          }
          onClick={submit}
        >
          Add destination
        </Button>
        {publication && !publicationExists && (
          <p className="text-sm text-warning">
            Publication must match an existing local Postgres publication.
          </p>
        )}
      </Card>

      <div className="space-y-3">
        {replication.destinations.length === 0 && (
          <Card className="p-4 text-sm text-foreground-light">
            No destinations configured in the local replication backend.
          </Card>
        )}
        {replication.destinations.map((destination) => (
          <Card key={destination.id} className="flex items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p>{destination.name}</p>
                {destination.status === 'active' && (
                  <CheckCircle2 size={16} className="text-brand" />
                )}
              </div>
              <p className="text-xs text-foreground-light">
                {destination.type} - {destination.publication} - {destination.status}
              </p>
              {destination.endpoint && (
                <p className="text-xs text-foreground-lighter">
                  Endpoint: {destination.endpoint.replace(/\/\/.*@/, '//***@')}
                </p>
              )}
            </div>
            <Button
              variant="default"
              icon={<Trash2 />}
              loading={remove.isPending}
              onClick={async () => {
                try {
                  await remove.mutateAsync({ id: destination.id })
                  toast.success('Destination removed')
                  await refetch()
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : 'Unable to remove destination'
                  )
                }
              }}
            >
              Remove
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
