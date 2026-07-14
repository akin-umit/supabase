import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'

import { analyticsKeys } from './keys'
import type { UsageApiCounts } from './project-log-stats-query'
import { executeAnalyticsSql } from '@/data/logs/execute-analytics-sql'
import { safeSql } from '@/data/logs/safe-analytics-sql'
import type { UseCustomQueryOptions } from '@/types'

const RAW_LOG_LIMIT = 10_000
const SERVICE_QUERIES = {
  total_api_requests: safeSql`select timestamp, id from edge_logs order by timestamp desc limit 10000`,
  total_functions_requests: safeSql`select timestamp, id from function_edge_logs order by timestamp desc limit 10000`,
  total_rest_requests: safeSql`select timestamp, id from edge_logs order by timestamp desc limit 10000`,
  total_auth_requests: safeSql`select timestamp, id from auth_logs order by timestamp desc limit 10000`,
  total_storage_requests: safeSql`select timestamp, id from storage_logs order by timestamp desc limit 10000`,
  total_realtime_requests: safeSql`select timestamp, id from realtime_logs order by timestamp desc limit 10000`,
} as const

type ServiceMetric = keyof typeof SERVICE_QUERIES
type RawLogRow = { timestamp: string; id: string }
type RawLogResponse = { result?: RawLogRow[] }

export type SelfHostedUsageResponse = { result: UsageApiCounts[] }

export function mergeSelfHostedUsageRows(
  responses: ReadonlyArray<readonly [ServiceMetric, RawLogResponse]>
): UsageApiCounts[] {
  const buckets = new Map<string, UsageApiCounts>()

  responses.forEach(([metric, response]) => {
    response.result?.slice(0, RAW_LOG_LIMIT).forEach((row) => {
      const timestamp = dayjs(row.timestamp).startOf('hour').toISOString()
      const bucket = buckets.get(timestamp) ?? {
        timestamp,
        total_api_requests: 0,
        total_functions_requests: 0,
        total_rest_requests: 0,
        total_auth_requests: 0,
        total_storage_requests: 0,
        total_realtime_requests: 0,
      }
      bucket[metric] = Number(bucket[metric]) + 1
      buckets.set(timestamp, bucket)
    })
  })

  return [...buckets.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

export async function getSelfHostedUsage(projectRef: string, signal?: AbortSignal) {
  const end = dayjs()
  const range = {
    iso_timestamp_start: end.subtract(24, 'hour').toISOString(),
    iso_timestamp_end: end.toISOString(),
  }
  const responses = await Promise.allSettled(
    Object.entries(SERVICE_QUERIES).map(async ([metric, sql]) => {
      const data = await executeAnalyticsSql({
        projectRef,
        endpoint: '/platform/projects/{ref}/analytics/endpoints/logs.all',
        sql,
        ...range,
        signal,
      })
      return [metric as ServiceMetric, data as unknown as RawLogResponse] as const
    })
  )

  const successfulResponses = responses
    .filter(
      (response): response is PromiseFulfilledResult<readonly [ServiceMetric, RawLogResponse]> => {
        return response.status === 'fulfilled'
      }
    )
    .map((response) => response.value)

  if (successfulResponses.length === 0) {
    throw new Error('Self-hosted usage data is unavailable')
  }

  return { result: mergeSelfHostedUsageRows(successfulResponses) }
}

export const useSelfHostedUsageQuery = <TData = SelfHostedUsageResponse>(
  projectRef?: string,
  options: UseCustomQueryOptions<SelfHostedUsageResponse, unknown, TData> = {}
) =>
  useQuery<SelfHostedUsageResponse, unknown, TData>({
    queryKey: analyticsKeys.usageApiCounts(projectRef, '1day'),
    queryFn: ({ signal }) => getSelfHostedUsage(projectRef!, signal),
    enabled: projectRef !== undefined,
    ...options,
  })
