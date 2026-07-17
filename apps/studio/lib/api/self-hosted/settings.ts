import { components } from 'api-types'

import {
  AUTH_JWT_SECRET,
  DEFAULT_EXPOSED_SCHEMAS,
  POSTGRES_DATABASE,
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_USER_READ_WRITE,
} from './constants'
import { assertSelfHosted } from './util'
import { PROJECT_ENDPOINT, PROJECT_ENDPOINT_PROTOCOL } from '@/lib/constants/api'

type ProjectAppConfig = components['schemas']['ProjectSettingsResponse']['app_config'] & {
  protocol?: string
}

export type ProjectSettings = components['schemas']['ProjectSettingsResponse'] & {
  app_config?: ProjectAppConfig
}

function firstExposedSchema() {
  return DEFAULT_EXPOSED_SCHEMAS.split(',').map((schema) => schema.trim())[0] || 'public'
}

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? ''
}

/**
 * Gets self-hosted project settings
 *
 * _Only call this from server-side self-hosted code._
 */
export function getProjectSettings() {
  assertSelfHosted()

  const response = {
    app_config: {
      db_schema: firstExposedSchema(),
      endpoint: PROJECT_ENDPOINT,
      storage_endpoint: PROJECT_ENDPOINT,
      // manually added to force the frontend to use the correct URL
      protocol: PROJECT_ENDPOINT_PROTOCOL,
    },
    cloud_provider: 'Self-hosted',
    db_dns_name: POSTGRES_HOST,
    db_host: POSTGRES_HOST,
    db_ip_addr_config: 'legacy' as const,
    db_name: POSTGRES_DATABASE,
    db_port: POSTGRES_PORT,
    db_user: POSTGRES_USER_READ_WRITE,
    inserted_at: '2021-08-02T06:40:40.646Z',
    jwt_secret: process.env.JWT_SECRET || AUTH_JWT_SECRET,
    name: process.env.DEFAULT_PROJECT_NAME || 'Default Project',
    ref: 'default',
    region: process.env.SUPABASE_REGION || process.env.REGION || 'self-hosted',
    service_api_keys: [
      {
        api_key: process.env.SUPABASE_ANON_KEY ?? '',
        name: 'anon key',
        tags: 'anon',
      },
      {
        api_key: getServiceRoleKey(),
        name: 'service_role key',
        tags: 'service_role',
      },
    ],
    ssl_enforced: false,
    status: 'ACTIVE_HEALTHY',
  } satisfies ProjectSettings

  return response
}
