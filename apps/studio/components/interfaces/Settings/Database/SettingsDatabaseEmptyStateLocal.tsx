import { Badge, Card, CardContent, CardHeader, CardTitle } from 'ui'

import { DocsButton } from '@/components/ui/DocsButton'
import { DOCS_URL } from '@/lib/constants'

const databaseSettings = [
  {
    title: 'Database password',
    status: 'Secret rotation',
    description:
      'Rotate the Postgres password in your secret manager or deployment environment, then redeploy the database-facing services.',
    files: ['POSTGRES_PASSWORD', 'SUPAVISOR_DB_PASSWORD', 'Coolify secrets'],
  },
  {
    title: 'Temporary access',
    status: 'Local roles',
    description:
      'Cloud support-member JIT access is replaced by explicit database roles, SSH, VPN, or psql access controlled by the operator.',
    files: ['psql', 'pg_roles', 'host firewall'],
  },
  {
    title: 'Connection pooling',
    status: 'Supavisor',
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
    status: 'Reverse proxy',
    description:
      'TLS, public Postgres exposure and firewall rules must be managed at the reverse proxy, host firewall and Postgres configuration layers.',
    files: ['POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_PASSWORD'],
  },
  {
    title: 'Network restrictions',
    status: 'Firewall',
    description:
      'Cloud IP allow lists are not available in the self-host Studio. Use the server firewall, reverse proxy and private Docker networks.',
    files: ['docker-compose.yml', 'Coolify network settings'],
  },
  {
    title: 'Connection logging',
    status: 'Postgres config',
    description:
      'Connection and disconnection logging are enabled from Postgres configuration, then surfaced through logs and observability.',
    files: ['postgresql.conf', 'log_connections', 'log_disconnections'],
  },
  {
    title: 'Network bans',
    status: 'Edge firewall',
    description:
      'Suspicious IP blocking is handled by your reverse proxy, CDN, WAF, fail2ban, or host firewall instead of Supabase Cloud.',
    files: ['Cloudflare rules', 'fail2ban', 'ufw'],
  },
  {
    title: 'Backups',
    status: 'Operator evidence',
    description:
      'Studio can show backup evidence from the self-host management API when the operator publishes verified recovery points.',
    files: ['management-api', 'backup evidence'],
  },
  {
    title: 'Migrations',
    status: 'Schema history',
    description:
      'Migration history is read from the project database and repository workflow so schema changes remain auditable.',
    files: ['supabase_migrations', 'migration evidence'],
  },
]

export function SettingsDatabaseEmptyStateLocal() {
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Self-hosted database controls</CardTitle>
            <Badge variant="default">Operator workflow</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground-light">
            Supabase Cloud applies these controls through its managed platform. In this self-hosted
            stack, the same operational needs are handled through Compose, environment variables,
            Postgres configuration, firewall rules, backup jobs, and the hosting panel. Studio shows
            the expected control surface and the exact runtime source instead of leaving the page
            empty.
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
