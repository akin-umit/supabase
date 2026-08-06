import { useParams } from 'common'
import { Database, Plus, RadioTower, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button, Card, Input } from 'ui'

import { AlertError } from '@/components/ui/AlertError'
import {
  useSelfHostedManagementMutation,
  useSelfHostedManagementQuery,
} from '@/data/self-hosted/management'

type Publication = { name: string; tables: string[]; allTables?: boolean; all_tables?: boolean }
type Slot = { name: string; plugin: string; active: boolean; retainedBytes?: number }
type Destination = {
  id: string
  name: string
  type: string
  status: 'active' | 'paused' | 'failed' | 'configured'
  publication: string
  endpoint?: string
}
type ReplicationState = {
  walLevel: string
  publications: Publication[]
  slots: Slot[]
  destinations: Destination[]
}

const destinationStatuses = new Set<Destination['status']>([
  'active',
  'paused',
  'failed',
  'configured',
])

function normalizeReplicationState(data: ReplicationState | undefined): ReplicationState {
  const publications = Array.isArray(data?.publications)
    ? data.publications.map((item) => ({
        name: String(item?.name ?? 'unnamed_publication'),
        allTables: Boolean(item?.allTables ?? item?.all_tables),
        tables: Array.isArray(item?.tables) ? item.tables.filter(Boolean).map(String) : [],
      }))
    : []

  const slots = Array.isArray(data?.slots)
    ? data.slots.map((slot) => ({
        name: String(slot?.name ?? 'unnamed_slot'),
        plugin: String(slot?.plugin ?? 'unknown'),
        active: Boolean(slot?.active),
        retainedBytes: typeof slot?.retainedBytes === 'number' ? slot.retainedBytes : undefined,
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
    walLevel: String(data?.walLevel ?? 'unknown'),
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

  const submit = async () => {
    try {
      await create.mutateAsync({ name, publication, endpoint, credential: endpoint, type: 'postgres' })
      setName('')
      setEndpoint('')
      toast.success('Replication destination created')
      await refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create destination')
    }
  }

  if (error) return <AlertError error={error} subject="Failed to retrieve replication state" />
  if (isPending)
    return <Card className="p-6 text-sm text-foreground-light">Loading replication...</Card>

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Database />
            <h3 className="text-lg">Publications</h3>
          </div>
          <p className="text-xs text-foreground-light">WAL level: {replication.walLevel}</p>
          {replication.publications.length ? (
            replication.publications.map((item) => (
              <div key={item.name} className="rounded border p-3">
                <p className="font-mono text-sm">{item.name}</p>
                <p className="text-xs text-foreground-light">
                  {item.allTables
                    ? 'All tables'
                    : item.tables.length > 0
                      ? item.tables.join(', ')
                      : 'No tables'}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-foreground-light">No logical publications.</p>
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
            <p className="text-sm text-foreground-light">No logical replication slots.</p>
          )}
        </Card>
      </div>

      <Card className="p-5 space-y-4">
        <div>
          <h3 className="text-lg">Add destination</h3>
          <p className="text-sm text-foreground-light">
            Connect a logical publication to a PostgreSQL-compatible destination.
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
          disabled={!name || !publication || !endpoint}
          onClick={submit}
        >
          Add destination
        </Button>
      </Card>

      <div className="space-y-3">
        {replication.destinations.map((destination) => (
          <Card key={destination.id} className="flex items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p>{destination.name}</p>
              <p className="text-xs text-foreground-light">
                {destination.type} · {destination.publication} · {destination.status}
              </p>
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
