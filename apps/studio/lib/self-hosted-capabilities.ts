export type SelfHostedCapabilityState = 'active' | 'runtime-config' | 'runtime-roadmap'

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
  | 'query-diagnostics'
  | 'rls-tester'
  | 'temporary-db-access'

export const SELF_HOSTED_CAPABILITIES: Record<SelfHostedCapabilityId, SelfHostedCapability> = {
  'log-drains': {
    state: 'runtime-config',
    title: 'Self-hosted log drains use the VPS logging runtime',
    description:
      'Studio reads Vector and Logflare status from the self-host runtime. Sink creation and tests must be backed by the local management API before they are shown as available.',
    backend:
      'Runtime status reader plus Vector/Logflare sink registry with RBAC, idempotency and audit logs',
  },
  branching: {
    state: 'runtime-roadmap',
    title: 'Branching requires a VPS project clone system',
    description:
      'Self-host branching must clone projects, storage, secrets, and domains inside the local control plane instead of calling Supabase Cloud APIs.',
    backend: 'Snapshot/clone control plane with project, storage and secret isolation',
  },
  'multi-project': {
    state: 'runtime-config',
    title: 'Multi-project creation uses the local control plane',
    description:
      'Studio creates projects through the local management API, reserves a VPS profile, generates secrets, and allocates the project subdomain.',
    backend: 'Project registry, domain allocator, secret generator and deployment adapter',
  },
  'backup-restore': {
    state: 'runtime-config',
    title: 'Backups use the VPS backup job runner',
    description:
      'Backup and restore actions are available when the management API reports a scheduler, restore worker, checksum history, and recovery evidence.',
    backend: 'Backup scheduler, restore drill, checksum history and rollback evidence',
  },
  'realtime-config': {
    state: 'runtime-config',
    title: 'Realtime settings are read from the runtime',
    description:
      'Self-host Realtime configuration is displayed from deployment runtime sources. Saving changes requires the local validator and service reload job.',
    backend: 'Runtime status reader, dry-run validator and restart/apply job',
  },
  'query-diagnostics': {
    state: 'runtime-roadmap',
    title: 'Diagnose blocked queries requires a local advisory worker',
    description:
      'The self-host dashboard should expose diagnostics only when a local worker can inspect pg_stat_activity safely and return redacted evidence.',
    backend:
      'Read-only pg_stat_activity sampler, blocking tree summarizer, redaction layer and audit trail',
  },
  'rls-tester': {
    state: 'runtime-roadmap',
    title: 'RLS Tester needs an isolated impersonation sandbox',
    description:
      'RLS policy testing should remain a backlog item until self-host deployments can run scoped role/JWT simulations without changing live auth or table policies.',
    backend:
      'Ephemeral transaction sandbox, JWT claim fixture builder, explain evidence and policy-safe rollback',
  },
  'temporary-db-access': {
    state: 'runtime-roadmap',
    title: 'Temporary DB access needs an audited grant controller',
    description:
      'Temporary access in self-host requires a local controller that grants and revokes roles with expiry and evidence.',
    backend:
      'Time-boxed grant controller, revocation worker, membership source, audit log and break-glass policy',
  },
}

export function getSelfHostedCapability(id: SelfHostedCapabilityId) {
  return SELF_HOSTED_CAPABILITIES[id]
}
