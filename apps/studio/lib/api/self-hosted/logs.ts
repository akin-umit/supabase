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
  'service-health',
])

const SERVICE_HEALTH_SOURCES = [
  'postgres_logs',
  'auth_logs',
  'function_edge_logs',
  'storage_logs',
  'realtime_logs',
  'postgrest_logs',
  'edge_logs',
  'supavisor_logs',
  'function_logs',
  'etl_replication_logs',
] as const

const SOURCE_NAME_PATTERN =
  /\b(?:logs|source|table|relation|identifier)\b[^"'`]*["'`]([A-Za-z0-9_]+_logs)["'`]/gi

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

export function getFunctionsCombinedStatsQuery(
  params: Record<string, string | string[] | undefined>
) {
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

  if (name === 'service-health') {
    return {
      name: 'logs.all',
      params: {
        ...params,
        sql: getServiceHealthQuery(params),
      },
    }
  }

  return { name, params }
}

function emptyServiceHealthBucket(timestamp: string) {
  const empty = { ok: 0, warning: 0, error: 0, total: 0 }
  return Object.fromEntries([
    ['timestamp', timestamp],
    ...SERVICE_HEALTH_SOURCES.map((source) => [source, empty]),
  ])
}

export function getEmptyAnalyticsResult(
  name: string,
  params: Record<string, string | string[] | undefined> = {}
) {
  if (name === 'service-health') {
    const timestamp =
      oneQueryParam(params.iso_timestamp_start) ??
      oneQueryParam(params.startDate) ??
      new Date().toISOString()
    return { result: [emptyServiceHealthBucket(timestamp)] }
  }

  return { result: [] }
}

export function getMissingAnalyticsSources(error: Error | undefined) {
  if (!error?.message) return []

  const sourceNames = new Set<string>()
  for (const match of error.message.matchAll(SOURCE_NAME_PATTERN)) {
    sourceNames.add(match[1])
  }

  for (const source of SERVICE_HEALTH_SOURCES) {
    if (new RegExp(`\\b${source}\\b`).test(error.message)) sourceNames.add(source)
  }

  return [...sourceNames].filter((source) =>
    (SERVICE_HEALTH_SOURCES as readonly string[]).includes(source)
  )
}

export function getServiceHealthQuery(params: Record<string, string | string[] | undefined>) {
  const granularity = analyticsIdentifier(
    oneQueryParam(params.granularity) ?? 'hour',
    'granularity'
  )
  const start = analyticsIdentifier(
    oneQueryParam(params.iso_timestamp_start) ?? oneQueryParam(params.startDate),
    'iso_timestamp_start'
  )
  const end = analyticsIdentifier(
    oneQueryParam(params.iso_timestamp_end) ?? oneQueryParam(params.endDate),
    'iso_timestamp_end'
  )

  return stripIndent`
    with service_events as (
      select
        timestamp_trunc(el.timestamp, ${granularity}) as timestamp,
        'edge_logs' as source,
        countif(response.status_code >= 500) as error,
        countif(response.status_code between 400 and 499) as warning,
        countif(response.status_code < 400) as ok,
        count(el.id) as total
      from edge_logs as el
      cross join unnest(el.metadata) as m
      cross join unnest(m.request) as request
      cross join unnest(m.response) as response
      where el.timestamp >= timestamp('${start}')
        and el.timestamp <= timestamp('${end}')
        and request.path not like '%/rest/%'
        and request.path not like '%/storage/%'
      group by timestamp

      union all

      select
        timestamp_trunc(el.timestamp, ${granularity}) as timestamp,
        'postgrest_logs' as source,
        countif(response.status_code >= 500) as error,
        countif(response.status_code between 400 and 499) as warning,
        countif(response.status_code < 400) as ok,
        count(el.id) as total
      from edge_logs as el
      cross join unnest(el.metadata) as m
      cross join unnest(m.request) as request
      cross join unnest(m.response) as response
      where el.timestamp >= timestamp('${start}')
        and el.timestamp <= timestamp('${end}')
        and request.path like '%/rest/%'
      group by timestamp

      union all

      select
        timestamp_trunc(pgl.timestamp, ${granularity}) as timestamp,
        'postgres_logs' as source,
        countif(parsed.error_severity in ('ERROR', 'FATAL', 'PANIC')) as error,
        countif(parsed.error_severity in ('WARNING', 'NOTICE')) as warning,
        countif(parsed.error_severity is null or parsed.error_severity not in ('ERROR', 'FATAL', 'PANIC', 'WARNING', 'NOTICE')) as ok,
        count(pgl.id) as total
      from postgres_logs as pgl
      cross join unnest(pgl.metadata) as m
      cross join unnest(m.parsed) as parsed
      where pgl.timestamp >= timestamp('${start}')
        and pgl.timestamp <= timestamp('${end}')
      group by timestamp

      union all

      select timestamp_trunc(timestamp, ${granularity}) as timestamp, 'auth_logs' as source, 0 as error, 0 as warning, count(id) as ok, count(id) as total
      from auth_logs
      where timestamp >= timestamp('${start}') and timestamp <= timestamp('${end}')
      group by timestamp

      union all

      select timestamp_trunc(timestamp, ${granularity}) as timestamp, 'function_edge_logs' as source, 0 as error, 0 as warning, count(id) as ok, count(id) as total
      from function_edge_logs
      where timestamp >= timestamp('${start}') and timestamp <= timestamp('${end}')
      group by timestamp

      union all

      select
        timestamp_trunc(el.timestamp, ${granularity}) as timestamp,
        'storage_logs' as source,
        countif(response.status_code >= 500) as error,
        countif(response.status_code between 400 and 499) as warning,
        countif(response.status_code < 400) as ok,
        count(el.id) as total
      from edge_logs as el
      cross join unnest(el.metadata) as m
      cross join unnest(m.request) as request
      cross join unnest(m.response) as response
      where el.timestamp >= timestamp('${start}')
        and el.timestamp <= timestamp('${end}')
        and request.path like '%/storage/%'
      group by timestamp

      union all

      select timestamp_trunc(timestamp, ${granularity}) as timestamp, 'realtime_logs' as source, 0 as error, 0 as warning, count(id) as ok, count(id) as total
      from realtime_logs
      where timestamp >= timestamp('${start}') and timestamp <= timestamp('${end}')
      group by timestamp
    )
    select
      timestamp,
      struct(
        sum(if(source = 'postgres_logs', ok, 0)) as ok,
        sum(if(source = 'postgres_logs', warning, 0)) as warning,
        sum(if(source = 'postgres_logs', error, 0)) as error,
        sum(if(source = 'postgres_logs', total, 0)) as total
      ) as postgres_logs,
      struct(
        sum(if(source = 'auth_logs', ok, 0)) as ok,
        sum(if(source = 'auth_logs', warning, 0)) as warning,
        sum(if(source = 'auth_logs', error, 0)) as error,
        sum(if(source = 'auth_logs', total, 0)) as total
      ) as auth_logs,
      struct(
        sum(if(source = 'function_edge_logs', ok, 0)) as ok,
        sum(if(source = 'function_edge_logs', warning, 0)) as warning,
        sum(if(source = 'function_edge_logs', error, 0)) as error,
        sum(if(source = 'function_edge_logs', total, 0)) as total
      ) as function_edge_logs,
      struct(
        sum(if(source = 'storage_logs', ok, 0)) as ok,
        sum(if(source = 'storage_logs', warning, 0)) as warning,
        sum(if(source = 'storage_logs', error, 0)) as error,
        sum(if(source = 'storage_logs', total, 0)) as total
      ) as storage_logs,
      struct(
        sum(if(source = 'realtime_logs', ok, 0)) as ok,
        sum(if(source = 'realtime_logs', warning, 0)) as warning,
        sum(if(source = 'realtime_logs', error, 0)) as error,
        sum(if(source = 'realtime_logs', total, 0)) as total
      ) as realtime_logs,
      struct(0 as ok, 0 as warning, 0 as error, 0 as total) as postgrest_logs,
      struct(
        sum(if(source = 'edge_logs', ok, 0)) as ok,
        sum(if(source = 'edge_logs', warning, 0)) as warning,
        sum(if(source = 'edge_logs', error, 0)) as error,
        sum(if(source = 'edge_logs', total, 0)) as total
      ) as edge_logs,
      struct(0 as ok, 0 as warning, 0 as error, 0 as total) as supavisor_logs,
      struct(0 as ok, 0 as warning, 0 as error, 0 as total) as function_logs,
      struct(0 as ok, 0 as warning, 0 as error, 0 as total) as etl_replication_logs
    from service_events
    group by timestamp
    order by timestamp asc
  `
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
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    assertSelfHosted()
    assert(PROJECT_ANALYTICS_URL, 'PROJECT_ANALYTICS_URL is required')
    assert(process.env.LOGFLARE_PRIVATE_ACCESS_TOKEN, 'LOGFLARE_PRIVATE_ACCESS_TOKEN is required')

    const baseUrl = new URL(PROJECT_ANALYTICS_URL)
    const apiPath = baseUrl.pathname.replace(/\/$/, '').endsWith('/api') ? '' : '/api'
    baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, '')}${apiPath}/`

    const controller = new AbortController()
    timeout = setTimeout(() => controller.abort(), ANALYTICS_TIMEOUT_MS)

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

    const result = await response.json().catch(() => ({}))

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
    if (timeout) clearTimeout(timeout)
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
