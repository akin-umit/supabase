import { useParams } from 'common'
import { Github, Triangle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button, Card, Input } from 'ui'

import { AlertError } from '@/components/ui/AlertError'
import {
  useSelfHostedManagementMutation,
  useSelfHostedManagementQuery,
} from '@/data/self-hosted/management'

type Integration = {
  connected: boolean
  account?: string
  repository?: string
  branch?: string
  project?: string
  team?: string
  lastSyncAt?: string
}

type IntegrationsResponse = {
  github?: Integration
  vercel?: Integration
}

type Provider = 'github' | 'vercel'

function IntegrationForm({
  provider,
  integration,
  onChanged,
}: {
  provider: Provider
  integration?: Integration
  onChanged: () => Promise<unknown>
}) {
  const { ref } = useParams()
  const [token, setToken] = useState('')
  const [target, setTarget] = useState(
    provider === 'github' ? (integration?.repository ?? '') : (integration?.project ?? '')
  )
  const [secondary, setSecondary] = useState(
    provider === 'github' ? (integration?.branch ?? 'main') : (integration?.team ?? '')
  )
  const connect = useSelfHostedManagementMutation<Integration, Record<string, string>>({
    projectRef: ref,
    resource: ['integrations', provider],
    method: 'POST',
  })
  const disconnect = useSelfHostedManagementMutation<unknown, Record<string, never>>({
    projectRef: ref,
    resource: ['integrations', provider],
    method: 'DELETE',
  })

  const submit = async () => {
    try {
      await connect.mutateAsync({
        token,
        ...(provider === 'github'
          ? { repository: target, branch: secondary || 'main' }
          : { project: target, team: secondary }),
      })
      setToken('')
      toast.success(`${provider === 'github' ? 'GitHub' : 'Vercel'} connected`)
      await onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Connection failed')
    }
  }

  const remove = async () => {
    try {
      await disconnect.mutateAsync({})
      toast.success(`${provider === 'github' ? 'GitHub' : 'Vercel'} disconnected`)
      await onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Disconnect failed')
    }
  }

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {provider === 'github' ? <Github size={20} /> : <Triangle size={20} />}
          <div>
            <h3>{provider === 'github' ? 'GitHub' : 'Vercel'}</h3>
            <p className="text-sm text-foreground-light">
              {integration?.connected
                ? `Connected${integration.account ? ` as ${integration.account}` : ''}`
                : 'Not connected'}
            </p>
          </div>
        </div>
        {integration?.connected && (
          <Button variant="danger" loading={disconnect.isPending} onClick={remove}>
            Disconnect
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Input
          type="password"
          autoComplete="new-password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder={`${provider === 'github' ? 'GitHub' : 'Vercel'} access token`}
        />
        <Input
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          placeholder={provider === 'github' ? 'owner/repository' : 'Project ID or slug'}
        />
        <Input
          value={secondary}
          onChange={(event) => setSecondary(event.target.value)}
          placeholder={provider === 'github' ? 'Branch' : 'Team ID (optional)'}
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-foreground-muted">
          {integration?.lastSyncAt
            ? `Last sync ${integration.lastSyncAt}`
            : 'Connection not tested'}
        </p>
        <Button
          variant="primary"
          loading={connect.isPending}
          disabled={!token || !target}
          onClick={submit}
        >
          {integration?.connected ? 'Update connection' : 'Connect'}
        </Button>
      </div>
    </Card>
  )
}

export function SelfHostedIntegrations() {
  const { ref } = useParams()
  const { data, error, isPending, refetch } = useSelfHostedManagementQuery<IntegrationsResponse>({
    projectRef: ref,
    resource: ['integrations'],
  })

  if (error) return <AlertError subject="Failed to retrieve integrations" error={error} />
  if (isPending)
    return <Card className="p-6 text-sm text-foreground-light">Loading integrations...</Card>

  return (
    <div className="space-y-6">
      <IntegrationForm provider="github" integration={data?.github} onChanged={refetch} />
      <IntegrationForm provider="vercel" integration={data?.vercel} onChanged={refetch} />
    </div>
  )
}
