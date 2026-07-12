import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'

import { analyticsKeys } from './keys'
import type { UsageApiCounts } from './project-log-stats-query'
import { executeAnalyticsSql } from '@/data/logs/execute-analytics-sql'
import { safeSql } from '@/data/logs/safe-analytics-sql'
import type { UseCustomQueryOptions } from '@/types'

const SELF_HOSTED_USAGE_SQL = safeSql`
select
  cast(timestamp_trunc(t.timestamp, hour) as datetime) as timestamp,
  countif(starts_with(request.path, '/rest/v1')) as total_rest_requests,
  countif(starts_with(request.path, '/auth/v1')) as total_auth_requests,
  countif(starts_with(request.path, '/storage/v1')) as total_storage_requests,
  countif(starts_with(request.path, '/realtime/v1')) as total_realtime_requests
from edge_logs t
  cross join unnest(metadata) as m
  cross join unnest(m.request) as request
group by timestamp
order by timestamp asc
`

export type SelfHostedUsageResponse = { result: UsageApiCounts[] }

export async function getSelfHostedUsage(projectRef: string, signal?: AbortSignal) {
  const end = dayjs()
  const data = await executeAnalyticsSql({
    projectRef,
    endpoint: '/platform/projects/{ref}/analytics/endpoints/logs.all',
    sql: SELF_HOSTED_USAGE_SQL,
    iso_timestamp_start: end.subtract(24, 'hour').toISOString(),
    iso_timestamp_end: end.toISOString(),
    signal,
  })

  return data as unknown as SelfHostedUsageResponse
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
