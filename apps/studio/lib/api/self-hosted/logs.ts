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
  result?: unknown[]
  error?: {
    message: string
  }
  [key: string]: unknown
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
          el.id,
          el.timestamp,
          el.event_message,
          request.method as method,
          request.path as path,
          request.search as search,
          response.status_code as status_code
        from edge_logs as el
        cross join unnest(el.metadata) as m
        cross join unnest(m.request) as request
        cross join unnest(m.response) as response
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
          pgl.timestamp,
          pgl.id,
          pgl.event_message,
          parsed.error_severity as error_severity,
          parsed.detail as detail,
          parsed.hint as hint
        from postgres_logs as pgl
        cross join unnest(pgl.metadata) as m
        cross join unnest(m.parsed) as parsed
        order by timestamp desc
        limit ${limit};
      `
    }
    case 'edge-function': {
      return stripIndent`
        select id, timestamp, event_message
        from function_edge_logs
        order by timestamp desc
        limit ${limit}
      `
    }
    case 'auth': {
      return stripIndent`
        select
          al.id,
          al.timestamp,
          al.event_message,
          m.level as level,
          m.status as status,
          m.path as path,
          m.msg as msg,
          m.error as error
        from auth_logs as al
        cross join unnest(al.metadata) as m
        order by timestamp desc
        limit ${limit};
      `
    }
    case 'storage': {
      return stripIndent`
        select id, timestamp, event_message
        from storage_logs
        order by timestamp desc
        limit ${limit};
      `
    }
    case 'realtime': {
      return stripIndent`
        select id, timestamp, event_message
        from realtime_logs
        order by timestamp desc
        limit ${limit};
      `
    }
    default: {
      throw new Error(`Unsupported log service: ${service}`)
    }
  }
}
