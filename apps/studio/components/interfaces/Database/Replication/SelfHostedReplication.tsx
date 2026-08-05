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

type Publication = { name: string; tables: string[]; allTables?: boolean }
type Slot = { name: string; plugin: string; active: boolean; retainedBytes?: number }
type Destination = {
  id: string
  name: string
  type: string
  status: 'active' | 'paused' | 'failed'
  publication: string
  endpoint?: string
}
type ReplicationState = {
  walLevel: string
  publications: Publication[]
  slots: Slot[]
  destinations: Destination[]
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

  const submit = async () => {
    try {
      await create.mutateAsync({ name, publication, endpoint, type: 'postgres' })
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
          {data?.publications?.length ? (
            data.publications.map((item) => (
              <div key={item.name} className="rounded border p-3">
                <p className="font-mono text-sm">{item.name}</p>
                <p className="text-xs text-foreground-light">
                  {item.allTables ? 'All tables' : item.tables.join(', ') || 'No tables'}
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
          {data?.slots?.length ? (
            data.slots.map((slot) => (
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
        {data?.destinations?.map((destination) => (
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
