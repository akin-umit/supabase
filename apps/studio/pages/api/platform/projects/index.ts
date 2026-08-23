import { randomUUID } from 'node:crypto'
import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import {
  requestSelfHostedManagementRoot,
  SelfHostedManagementError,
} from '@/lib/api/self-hosted/management'
import { getSelfHostedOrganizationProjects } from '@/lib/api/self-hosted/organization'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'GET':
      return handleGetAll(req, res)
    case 'POST':
      return handleCreate(req, res)
    default:
      res.setHeader('Allow', ['GET', 'POST'])
      res.status(405).json({ data: null, error: { message: `Method ${method} Not Allowed` } })
  }
}

const handleGetAll = async (_req: NextApiRequest, res: NextApiResponse) => {
  const response = (await getSelfHostedOrganizationProjects({ limit: 500, offset: 0 })).projects
  return res.status(200).json(response)
}

const PROJECT_REF_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])?$/

const handleCreate = async (req: NextApiRequest, res: NextApiResponse) => {
  const body = req.body ?? {}
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const organizationSlug =
    typeof body.organization_slug === 'string' ? body.organization_slug : 'default-org-slug'
  const unsupportedFields = [
    'cloud_provider',
    'db_pass',
    'db_region',
    'region_selection',
    'db_sql',
    'desired_instance_size',
    'db_pricing_tier_id',
    'postgres_engine',
    'release_channel',
    'high_availability',
    'custom_supabase_internal_requests',
  ].filter((field) => Object.hasOwn(body, field))

  if (name.length < 3) {
    return res.status(400).json({
      data: null,
      error: { message: 'Project name must be at least 3 characters long.' },
    })
  }
  if (unsupportedFields.length > 0) {
    return res.status(400).json({
      data: null,
      error: {
        message:
          'Self-hosted project creation uses VPS provisioning and does not accept cloud project fields.',
      },
    })
  }

  const ref = createProjectRef(name)

  try {
    const payload = (await requestSelfHostedManagementRoot({
      resource: ['projects'],
      method: 'POST',
      body: {
        ref,
        name,
      },
    })) as { project?: Record<string, unknown>; job?: Record<string, unknown> }

    const project = payload.project ?? {}
    const projectRef = typeof project.ref === 'string' ? project.ref : ref
    const apiHostname = typeof project.apiHostname === 'string' ? project.apiHostname : undefined

    return res.status(202).json({
      anon_key: '',
      cloud_provider: 'LOCAL',
      endpoint: apiHostname ? `https://${apiHostname}` : '',
      id: typeof project.id === 'number' ? project.id : 0,
      inserted_at:
        typeof project.createdAt === 'string' ? project.createdAt : new Date().toISOString(),
      is_branch_enabled: false,
      is_physical_backups_enabled: false,
      name: typeof project.name === 'string' ? project.name : name,
      organization_id: 1,
      organization_slug: organizationSlug,
      preview_branch_refs: [],
      ref: projectRef,
      region: typeof project.region === 'string' ? project.region : 'local-vps',
      service_key: '',
      status: typeof project.status === 'string' ? project.status : 'COMING_UP',
      subscription_id: null,
    })
  } catch (error) {
    const status = error instanceof SelfHostedManagementError ? error.statusCode : 500
    const message =
      error instanceof SelfHostedManagementError
        ? explainSelfHostedCreateError(error.message)
        : 'Self-hosted project creation failed.'

    return res.status(status).json({ data: null, error: { message } })
  }
}

function createProjectRef(name: string) {
  const base =
    name
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .slice(0, 40)
      .replace(/-+$/g, '') || 'project'

  const candidate = `${base}-${randomUUID().slice(0, 6)}`.slice(0, 48).replace(/-+$/g, '')

  return PROJECT_REF_PATTERN.test(candidate) ? candidate : `project-${randomUUID().slice(0, 8)}`
}

function explainSelfHostedCreateError(message: string) {
  if (message === 'Management API is not configured') {
    return 'Self-hosted project creation requires the management API write bridge. Configure INTERNAL_MANAGEMENT_API_URL and INTERNAL_MANAGEMENT_API_WRITE_TOKEN.'
  }
  if (message === 'Unable to reach management API') {
    return 'Unable to reach the self-hosted management API. Check the internal management API URL and network path from Studio.'
  }
  if (message.includes('verified_base_domain')) {
    return 'Self-hosted project creation requires a verified base domain so Studio can create project subdomains.'
  }
  if (message.includes('project_provisioning_not_configured')) {
    return `Self-hosted project creation requires the Coolify provisioning bridge to be configured. ${message}`
  }
  if (message.includes('coolify')) {
    return 'Self-hosted project creation requires the Coolify provisioning bridge to be configured.'
  }
  return message
}
