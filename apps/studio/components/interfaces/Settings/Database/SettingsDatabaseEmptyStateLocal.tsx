import { Badge, Card, CardContent, CardHeader, CardTitle } from 'ui'

import { DocsButton } from '@/components/ui/DocsButton'
import { DOCS_URL } from '@/lib/constants'

const databaseSettings = [
  {
    title: 'Connection pooling',
    status: 'Configured in Compose',
    description:
      'Pooler mode, transaction/session ports and pool sizes are controlled by the Supavisor service environment.',
    files: [
      'POOLER_PROXY_PORT_TRANSACTION',
      'POOLER_PROXY_PORT_SESSION',
      'POOLER_DEFAULT_POOL_SIZE',
    ],
  },
  {
    title: 'SSL and external database access',
    status: 'Operator managed',
    description:
      'TLS, public Postgres exposure and firewall rules must be managed at the reverse proxy, host firewall and Postgres configuration layers.',
    files: ['POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_PASSWORD'],
  },
  {
    title: 'Network restrictions',
    status: 'Host managed',
    description:
      'Cloud IP allow lists are not available in the self-host Studio. Use the server firewall, reverse proxy and private Docker networks.',
    files: ['docker-compose.yml', 'Coolify network settings'],
  },
  {
    title: 'Disk, backups and migrations',
    status: 'Evidence based',
    description:
      'Studio can display operator-published backup and migration evidence, but it should not pretend to resize disks or restore backups without a real control plane.',
    files: ['management-api', 'backup evidence', 'migration evidence'],
  },
]

export function SettingsDatabaseEmptyStateLocal() {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Self-hosted database controls</CardTitle>
            <Badge variant="default">Read-only</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground-light">
            Supabase Cloud can change database settings through its managed control plane. In this
            self-hosted stack, these settings are applied through Compose, environment variables,
            Postgres configuration and operator evidence. Studio only shows controls when the
            runtime can prove or safely apply them.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {databaseSettings.map((setting) => (
              <div
                key={setting.title}
                className="rounded border bg-surface-100 px-4 py-3 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{setting.title}</p>
                  <Badge variant="default">{setting.status}</Badge>
                </div>
                <p className="text-sm text-foreground-light">{setting.description}</p>
                <div className="flex flex-wrap gap-2">
                  {setting.files.map((file) => (
                    <code key={file} className="text-code-inline">
                      {file}
                    </code>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Local development & CLI</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground-light mb-4">
            Configure database settings in{' '}
            <code className="text-code-inline">supabase/config.toml</code> - applied automatically
            on <code className="text-code-inline">supabase start</code>.
          </p>
          <DocsButton href={`${DOCS_URL}/guides/local-development/cli/config#database-config`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Self-Hosted Supabase</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground-light mb-4">
            Change settings in{' '}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://github.com/supabase/supabase/blob/master/docker/.env.example"
            >
              .env file
            </a>{' '}
            and{' '}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://github.com/supabase/supabase/blob/master/docker/docker-compose.yml"
            >
              docker-compose.yml
            </a>
            .
          </p>
          <DocsButton
            href={`${DOCS_URL}/guides/self-hosting/docker#configuring-and-securing-supabase`}
          />
        </CardContent>
      </Card>
    </>
  )
}
