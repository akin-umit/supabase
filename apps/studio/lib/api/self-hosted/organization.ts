import { DEFAULT_PROJECT } from '@/lib/constants/api'

const ORGANIZATION_ID = 1
const ORGANIZATION_SLUG = 'default-org-slug'
const TIMESTAMP_MICROS_PER_MS = 1000

function nowIso() {
  return new Date().toISOString()
}

function currentPeriod() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return {
    startUnix: Math.floor(start.getTime() / 1000),
    endUnix: Math.floor(end.getTime() / 1000),
  }
}

export async function getSelfHostedOrganization() {
  return {
    billing_email: null,
    billing_partner: null,
    has_oriole_project: false,
    id: ORGANIZATION_ID,
    integration_source: 'self-hosted',
    is_owner: true,
    name: process.env.DEFAULT_ORGANIZATION_NAME || 'Aqenta',
    opt_in_tags: [],
    organization_missing_address: false,
    organization_missing_tax_id: false,
    organization_requires_mfa: false,
    plan: { id: 'enterprise', name: 'Self-hosted' },
    restriction_data: null,
    restriction_status: null,
    slug: ORGANIZATION_SLUG,
    stripe_customer_id: null,
    subscription_id: null,
    usage_billing_enabled: false,
  }
}

export function getSelfHostedProject(ref?: string) {
  const insertedAt =
    process.env.DEFAULT_PROJECT_INSERTED_AT || DEFAULT_PROJECT.inserted_at || nowIso()
  const projectRef = ref || process.env.DEFAULT_PROJECT_REF || DEFAULT_PROJECT.ref

  return {
    ...DEFAULT_PROJECT,
    id: DEFAULT_PROJECT.id,
    ref: projectRef,
    name: process.env.DEFAULT_PROJECT_NAME || DEFAULT_PROJECT.name,
    organization_id: ORGANIZATION_ID,
    status: process.env.DEFAULT_PROJECT_STATUS || DEFAULT_PROJECT.status,
    region: process.env.SUPABASE_REGION || process.env.REGION || DEFAULT_PROJECT.region,
    inserted_at: insertedAt,
    updated_at: insertedAt,
    cloud_provider: 'self-hosted',
    databases: [
      {
        identifier: projectRef,
        infra_compute_size: process.env.SELF_HOSTED_COMPUTE_SIZE || 'local-vps',
        status: process.env.POSTGRES_HOST ? 'ACTIVE_HEALTHY' : 'UNKNOWN',
      },
    ],
  }
}

export function getSelfHostedAvailableRegions() {
  const regionName = process.env.SELF_HOSTED_REGION_NAME || 'Local VPS'
  const regionCode = process.env.SELF_HOSTED_REGION_CODE || 'local-vps'
  const localRegion = {
    code: regionCode,
    name: regionName,
    provider: 'SELF_HOSTED',
    type: 'specific',
  }
  const localSmartGroup = {
    code: regionCode,
    name: regionName,
    type: 'smartGroup',
  }

  return {
    all: {
      smartGroup: [localSmartGroup],
      specific: [localRegion],
    },
    recommendations: {
      smartGroup: localSmartGroup,
      specific: [localRegion],
    },
  }
}

export async function getSelfHostedOrganizationProjects({
  limit = 96,
  offset = 0,
  search,
  statuses,
  sort,
}: {
  limit?: number
  offset?: number
  search?: string
  statuses?: string
  sort?: string
}) {
  const project = getSelfHostedProject()
  const statusFilter = statuses ? new Set(statuses.split(',').filter(Boolean)) : undefined
  const matchesSearch =
    !search ||
    project.name.toLowerCase().includes(search.toLowerCase()) ||
    project.ref.toLowerCase().includes(search.toLowerCase())
  const matchesStatus = !statusFilter || statusFilter.has(project.status)

  const projects = matchesSearch && matchesStatus ? [project] : []
  const sorted = [...projects].sort((a, b) => {
    if (sort === 'name_desc') return b.name.localeCompare(a.name)
    if (sort === 'created_asc') return a.inserted_at.localeCompare(b.inserted_at)
    if (sort === 'created_desc') return b.inserted_at.localeCompare(a.inserted_at)
    return a.name.localeCompare(b.name)
  })

  return {
    projects: sorted.slice(offset, offset + limit),
    pagination: {
      count: sorted.length,
      limit,
      offset,
    },
  }
}

export async function updateSelfHostedOrganization(body: Record<string, unknown>) {
  const current = await getSelfHostedOrganization()
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : current.name

  return {
    ...current,
    name,
    slug: current.slug,
  }
}

export async function getSelfHostedMembers() {
  return [
    {
      gotrue_id: 'self-hosted-owner',
      id: 'self-hosted-owner',
      mfa_enabled: false,
      primary_email: process.env.STUDIO_ADMIN_EMAIL || 'admin@self-hosted.local',
      role_ids: [1],
      username: process.env.STUDIO_ADMIN_NAME || 'Self-hosted admin',
    },
  ]
}

export function getSelfHostedRoles() {
  return {
    org_scoped_roles: [
      {
        description: 'Full access to this self-hosted organization.',
        id: 1,
        name: 'Owner',
        permissions: ['*'],
        projects: [],
      },
      {
        description: 'Administrative access for self-hosted runtime operations.',
        id: 2,
        name: 'Administrator',
        permissions: ['*'],
        projects: [],
      },
    ],
    project_scoped_roles: [],
  }
}

export async function getSelfHostedSubscription() {
  const { startUnix, endUnix } = currentPeriod()

  return {
    addons: [],
    billing_cycle_anchor: startUnix,
    billing_via_partner: false,
    billing_partner: null,
    current_period_end: endUnix,
    current_period_start: startUnix,
    inserted_at: nowIso(),
    is_free_plan: false,
    is_overdue: false,
    is_paid_plan: true,
    next_invoice_at: endUnix,
    payment_method_type: 'self-hosted',
    plan: { id: 'enterprise' as const, name: 'Self-hosted' },
    project_addons: [],
    projects: [],
    scheduled_plan_change: null,
    subscription_id: null,
    usage_billing_enabled: false,
  }
}

export async function getSelfHostedUsage() {
  return {
    usages: [
      {
        available_in_plan: true,
        included_in_plan: true,
        metric: 'COMPUTE_HOURS_SM',
        pricing_free_units: 0,
        pricing_unit: 'hour',
        project_ref: null,
        quota: null,
        unlimited: true,
        usage: 0,
      },
      {
        available_in_plan: true,
        included_in_plan: true,
        metric: 'DATABASE_SIZE',
        pricing_free_units: 0,
        pricing_unit: 'GB',
        project_ref: null,
        quota: null,
        unlimited: true,
        usage: 0,
      },
      {
        available_in_plan: true,
        included_in_plan: true,
        metric: 'STORAGE_SIZE',
        pricing_free_units: 0,
        pricing_unit: 'GB',
        project_ref: null,
        quota: null,
        unlimited: true,
        usage: 0,
      },
    ],
  }
}

export async function getSelfHostedDailyUsage() {
  return {
    usages: [],
  }
}

export async function getSelfHostedAuditLogs({
  slug,
  iso_timestamp_start,
  iso_timestamp_end,
}: {
  slug?: string
  iso_timestamp_start?: string
  iso_timestamp_end?: string
}) {
  const organizationSlug = slug || ORGANIZATION_SLUG
  const start = iso_timestamp_start ? Date.parse(iso_timestamp_start) : Number.NaN
  const end = iso_timestamp_end ? Date.parse(iso_timestamp_end) : Number.NaN
  const now = Date.now()
  const timestamp = Number.isFinite(end)
    ? end * TIMESTAMP_MICROS_PER_MS
    : now * TIMESTAMP_MICROS_PER_MS

  const seedLog = {
    organization_slug: organizationSlug,
    project_ref: process.env.DEFAULT_PROJECT_REF || DEFAULT_PROJECT.ref,
    request_id: `self-hosted-audit-${organizationSlug}`,
    action: {
      name: 'self_hosted.audit.available',
      method: 'GET',
      route: '/platform/organizations/{slug}/audit',
      status: 200,
      metadata: {
        source: 'self-hosted',
        window_start: Number.isFinite(start) ? new Date(start).toISOString() : null,
        window_end: Number.isFinite(end) ? new Date(end).toISOString() : null,
      },
    },
    actor: {
      token_type: 'self_hosted_admin',
      user_id: 'self-hosted-owner',
      email: process.env.STUDIO_ADMIN_EMAIL || 'admin@self-hosted.local',
      ip: '127.0.0.1',
    },
    timestamp,
  }

  return {
    result: process.env.SELF_HOSTED_AUDIT_LOGS_EMPTY === 'true' ? [] : [seedLog],
    retention_period: Number(process.env.SELF_HOSTED_AUDIT_RETENTION_DAYS || 90),
  }
}
