import assert from 'node:assert'
import { LogsService } from '@supabase/mcp-server-supabase/platform'
import { stripIndent } from 'common-tags'

import { WrappedResult } from './types'
import { assertSelfHosted } from './util'
import { PROJECT_ANALYTICS_URL } from '@/lib/constants/api'

export type RetrieveAnalyticsDataOptions = {
  name: string
  projectRef: string
  params: Record<string, string | undefined>
}

export type AnalyticsResult = {
  result?: any[]
  error?: {
    message: string
  }
  [key: string]: any
}

/**
 * Retrieves analytics data from Logflare.
 *
 * _Only call this from server-side self-hosted code._
 */
export async function retrieveAnalyticsData({
  name,
  projectRef,
  params,
}: RetrieveAnalyticsDataOptions): Promise<WrappedResult<AnalyticsResult>> {
  assertSelfHosted()
  assert(PROJECT_ANALYTICS_URL, 'PROJECT_ANALYTICS_URL is required')
  assert(process.env.LOGFLARE_PRIVATE_ACCESS_TOKEN, 'LOGFLARE_PRIVATE_ACCESS_TOKEN is required')

  const baseUrl = new URL(PROJECT_ANALYTICS_URL)
  const apiPath = baseUrl.pathname.replace(/\/$/, '').endsWith('/api') ? '' : '/api'
  baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, '')}${apiPath}/`
  const url = new URL(`endpoints/query/${encodeURIComponent(name)}`, baseUrl)
  url.searchParams.set('project', projectRef)

  // Add all other params
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, value)
    }
  })

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.LOGFLARE_PRIVATE_ACCESS_TOKEN,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })

    const result = await response.json()

    if (!response.ok) {
      const error = new Error(
        result?.error?.message ?? `Failed to retrieve analytics data: ${response.statusText}`
      )
      return { data: undefined, error }
    }

    return { data: result, error: undefined }
  } catch (error) {
    if (error instanceof Error) {
      return { data: undefined, error }
    }
    throw error
  }
}

export function getLogQuery(service: LogsService, limit: number = 100): string {
  assertSelfHosted()

  switch (service) {
    case 'api': {
      return stripIndent`
        select
          id,
          timestamp,
          event_message,
          log_attributes['request.method'] as method,
          log_attributes['request.path'] as path,
          log_attributes['request.search'] as search,
          log_attributes['response.status_code'] as status_code
        from logs
        where source = 'edge_logs'
        order by timestamp desc
        limit ${limit};
      `
    }
    case 'branch-action': {
      throw new Error('Branching is only supported in the hosted Supabase platform')
    }
    case 'postgres': {
      return stripIndent`
        select
          timestamp,
          id,
          event_message,
          log_attributes['parsed.error_severity'] as error_severity,
          log_attributes['parsed.detail'] as detail,
          log_attributes['parsed.hint'] as hint
        from logs
        where source = 'postgres_logs'
        order by timestamp desc
        limit ${limit};
      `
    }
    case 'edge-function': {
      return stripIndent`
        select id, timestamp, event_message
        from logs
        where source = 'function_edge_logs'
        order by timestamp desc
        limit ${limit}
      `
    }
    case 'auth': {
      return stripIndent`
        select
          id,
          timestamp,
          event_message,
          log_attributes['level'] as level,
          log_attributes['status'] as status,
          log_attributes['path'] as path,
          log_attributes['msg'] as msg,
          log_attributes['error'] as error
        from logs
        where source = 'auth_logs'
        order by timestamp desc
        limit ${limit};
      `
    }
    case 'storage': {
      return stripIndent`
        select id, timestamp, event_message
        from logs
        where source = 'storage_logs'
        order by timestamp desc
        limit ${limit};
      `
    }
    case 'realtime': {
      return stripIndent`
        select id, timestamp, event_message
        from logs
        where source = 'realtime_logs'
        order by timestamp desc
        limit ${limit};
      `
    }
    default: {
      throw new Error(`Unsupported log service: ${service}`)
    }
  }
}
