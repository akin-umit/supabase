import { useParams } from 'common'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button, Card, Input, Switch } from 'ui'

import { AlertError } from '@/components/ui/AlertError'
import {
  useSelfHostedManagementMutation,
  useSelfHostedManagementQuery,
} from '@/data/self-hosted/management'

type WebhookEndpoint = {
  id: string
  name: string
  url: string
  enabled: boolean
  events: string[]
  lastDeliveryAt?: string
  lastStatus?: number
}

type WebhookResponse = { endpoints: WebhookEndpoint[] }

export function SelfHostedWebhooks({ endpointId }: { endpointId?: string }) {
  const { ref } = useParams()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState('*')
  const resource = endpointId ? ['webhooks', endpointId] : ['webhooks']
  const { data, error, isPending, refetch } = useSelfHostedManagementQuery<
    WebhookResponse | WebhookEndpoint
  >({ projectRef: ref, resource })
  const create = useSelfHostedManagementMutation<WebhookEndpoint, Record<string, unknown>>({
    projectRef: ref,
    resource: ['webhooks'],
    method: 'POST',
  })
  const update = useSelfHostedManagementMutation<WebhookEndpoint, { id: string; enabled: boolean }>(
    {
      projectRef: ref,
      resource: (value) => ['webhooks', value.id],
      method: 'PATCH',
    }
  )
  const remove = useSelfHostedManagementMutation<unknown, { id: string }>({
    projectRef: ref,
    resource: (value) => ['webhooks', value.id],
    method: 'DELETE',
  })

  const endpoints = endpointId
    ? data && 'id' in data
      ? [data]
      : []
    : data && 'endpoints' in data
      ? data.endpoints
      : []

  const run = async (operation: Promise<unknown>, message: string) => {
    try {
      await operation
      toast.success(message)
      await refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Webhook operation failed')
    }
  }

  if (error) return <AlertError subject="Failed to retrieve webhooks" error={error} />

  return (
    <div className="space-y-6">
      {!endpointId && (
        <Card className="p-6 space-y-4">
          <h3 className="text-lg">Create webhook endpoint</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name"
            />
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/webhook"
            />
            <Input
              value={events}
              onChange={(event) => setEvents(event.target.value)}
              placeholder="Events, comma separated"
            />
          </div>
          <div className="flex justify-end">
            <Button
              icon={<Plus size={14} />}
              loading={create.isPending}
              disabled={!name || !url}
              onClick={() =>
                run(
                  create.mutateAsync({
                    name,
                    url,
                    events: events
                      .split(',')
                      .map((event) => event.trim())
                      .filter(Boolean),
                    enabled: true,
                  }),
                  'Webhook created'
                ).then(() => {
                  setName('')
                  setUrl('')
                })
              }
            >
              Create endpoint
            </Button>
          </div>
        </Card>
      )}

      <Card className="divide-y">
        {isPending ? (
          <div className="p-6 text-sm text-foreground-light">Loading webhooks...</div>
        ) : endpoints.length === 0 ? (
          <div className="p-6 text-sm text-foreground-light">No webhook endpoints</div>
        ) : (
          endpoints.map((endpoint) => (
            <div key={endpoint.id} className="flex flex-col gap-4 p-6 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{endpoint.name}</p>
                <p className="truncate text-sm text-foreground-light">{endpoint.url}</p>
                <p className="text-xs text-foreground-muted">
                  {endpoint.events.join(', ')}
                  {endpoint.lastDeliveryAt
                    ? ` · Last delivery ${endpoint.lastDeliveryAt}${endpoint.lastStatus ? ` (${endpoint.lastStatus})` : ''}`
                    : ''}
                </p>
              </div>
              <Switch
                checked={endpoint.enabled}
                onCheckedChange={(enabled) =>
                  run(update.mutateAsync({ id: endpoint.id, enabled }), 'Webhook updated')
                }
              />
              <Button
                variant="danger"
                icon={<Trash2 size={14} />}
                loading={remove.isPending}
                onClick={() => run(remove.mutateAsync({ id: endpoint.id }), 'Webhook deleted')}
              >
                Delete
              </Button>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
