export type SelfHostedCapabilityState = 'active' | 'operator-managed' | 'planned' | 'cloud-only'

export type SelfHostedCapability = {
  state: SelfHostedCapabilityState
  title: string
  description: string
  backend: string
}

export type SelfHostedCapabilityId =
  | 'log-drains'
  | 'branching'
  | 'multi-project'
  | 'backup-restore'
  | 'realtime-config'

export const SELF_HOSTED_CAPABILITIES: Record<SelfHostedCapabilityId, SelfHostedCapability> = {
  'log-drains': {
    state: 'planned',
    title: 'Self-hosted log drains need an operator backend',
    description:
      'Studio cannot create, update or test Log Drain destinations in self-hosted mode until a local sink registry and audited apply job exist.',
    backend: 'Vector/Logflare sink registry with RBAC, idempotency and audit logs',
  },
  branching: {
    state: 'planned',
    title: 'Branching needs a self-host project clone system',
    description:
      'Supabase Cloud branching APIs are not part of the self-host stack. Self-host branching must be implemented as snapshot or clone projects.',
    backend: 'Snapshot/clone control plane with project, storage and secret isolation',
  },
  'multi-project': {
    state: 'planned',
    title: 'Multi-project creation needs a control plane',
    description:
      'The self-host Studio stack represents one project. Creating projects from the dashboard requires a separate project factory.',
    backend: 'Project registry, domain allocator, secret generator and deployment adapter',
  },
  'backup-restore': {
    state: 'operator-managed',
    title: 'Backups are operator-managed until the job runner exists',
    description:
      'Backup and restore evidence can be shown in Studio, but active backup or restore actions require an audited job runner.',
    backend: 'Backup scheduler, restore drill, checksum history and rollback evidence',
  },
  'realtime-config': {
    state: 'planned',
    title: 'Realtime settings need a config apply workflow',
    description:
      'Self-host Realtime configuration can be displayed from runtime defaults, but saving changes requires validation and service reload jobs.',
    backend: 'Realtime config reader, dry-run validator and restart/apply job',
  },
}

export function getSelfHostedCapability(id: SelfHostedCapabilityId) {
  return SELF_HOSTED_CAPABILITIES[id]
}
