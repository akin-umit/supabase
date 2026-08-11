import assert from 'node:assert'
import { LogsService } from '@supabase/mcp-server-supabase/platform'
import { stripIndent } from 'common-tags'

import { WrappedResult } from './types'
import { assertSelfHosted } from './util'
import { PROJECT_ANALYTICS_URL } from '@/lib/constants/api'

export type RetrieveAnalyticsDataOptions = {
  name: string
  projectRef: string
  params: Record<string, string | string[] | undefined>
}

export type AnalyticsResult = {
  result?: unknown[]
  error?: {
    message: string
  }
  [key: string]: unknown
}

const ANALYTICS_TIMEOUT_MS = 20_000
const SUPPORTED_ANALYTICS_ENDPOINTS = new Set([
  'logs.all',
  'logs.all.otel',
  'functions.combined-stats',
])

const FUNCTION_STATS_INTERVALS: Record<string, string> = {
  '15min': 'minute',
  '1hr': 'minute',
  '3hr': 'hour',
  '1day': 'hour',
}

function oneQueryParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function analyticsIdentifier(value: string | undefined, label: string) {
  if (!value || !/^[A-Za-z0-9_./:-]+$/.test(value)) {
    throw new Error(`Invalid ${label}`)
  }
  return value.replaceAll("'", "\\'")
}

export function getFunctionsCombinedStatsQuery(params: Record<string, string | string[] | undefined>) {
  const functionId = analyticsIdentifier(oneQueryParam(params.function_id), 'function_id')
  const interval = oneQueryParam(params.interval) ?? '1hr'
  const granularity = FUNCTION_STATS_INTERVALS[interval] ?? 'hour'

  return stripIndent`
    select
      timestamp_trunc(fel.timestamp, ${granularity}) as timestamp,
      count(fel.id) as requests_count,
      countif(response.status_code between 200 and 299) as success_count,
      countif(response.status_code between 300 and 399) as redirect_count,
      countif(response.status_code between 400 and 499) as client_err_count,
      countif(response.status_code >= 500) as server_err_count,
      avg(m.execution_time_ms) as avg_execution_time,
      max(m.execution_time_ms) as max_execution_time,
      0 as log_count,
      0 as log_info_count,
      0 as log_warn_count,
      0 as log_error_count
    from function_edge_logs as fel
    cross join unnest(fel.metadata) as m
    cross join unnest(m.response) as response
    where function_id = '${functionId}'
    group by timestamp
    order by timestamp asc
  `
}

function normalizeAnalyticsRequest(
  name: string,
  params: Record<string, string | string[] | undefined>
) {
  if (!SUPPORTED_ANALYTICS_ENDPOINTS.has(name)) {
    throw new Error(`Unsupported self-hosted analytics endpoint: ${name}`)
  }

  if (name === 'functions.combined-stats') {
    return {
      name: 'logs.all',
      params: {
        ...params,
        sql: getFunctionsCombinedStatsQuery(params),
      },
    }
  }

  return { name, params }
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

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ANALYTICS_TIMEOUT_MS)

  try {
    const normalized = normalizeAnalyticsRequest(name, params)
    const url = new URL(`endpoints/query/${encodeURIComponent(normalized.name)}`, baseUrl)
    url.searchParams.set('project', projectRef)

    // Add all other params
    Object.entries(normalized.params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, Array.isArray(value) ? value[0] : value)
      }
    })

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.LOGFLARE_PRIVATE_ACCESS_TOKEN,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      signal: controller.signal,
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
  } finally {
    clearTimeout(timeout)
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
