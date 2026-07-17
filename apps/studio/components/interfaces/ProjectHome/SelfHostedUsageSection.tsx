import { useParams } from 'common'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Loading, WarningIcon } from 'ui'
import { ChartEmptyState } from 'ui-patterns/Chart'
import { LogsBarChart } from 'ui-patterns/LogsBarChart'
import { Row } from 'ui-patterns/Row'

import NoDataPlaceholder from '@/components/ui/Charts/NoDataPlaceholder'
import type { UsageApiCounts } from '@/data/analytics/project-log-stats-query'
import { useSelfHostedUsageQuery } from '@/data/analytics/self-hosted-usage-query'
import { fillTimeseriesSorted } from '@/hooks/analytics/useFillTimeseriesSorted'

type LogsBarChartDatum = {
  timestamp: string
  error_count: number
  ok_count: number
  warning_count: number
}

type ServiceKey = 'api' | 'functions' | 'rest' | 'auth' | 'storage' | 'realtime'

const SERVICES: Array<{
  key: ServiceKey
  title: string
  dataKey: keyof UsageApiCounts
}> = [
  { key: 'api', title: 'API Gateway', dataKey: 'total_api_requests' },
  { key: 'functions', title: 'Edge Functions', dataKey: 'total_functions_requests' },
  { key: 'rest', title: 'Postgres / REST', dataKey: 'total_rest_requests' },
  { key: 'storage', title: 'Storage', dataKey: 'total_storage_requests' },
  { key: 'realtime', title: 'Realtime', dataKey: 'total_realtime_requests' },
  { key: 'auth', title: 'Auth', dataKey: 'total_auth_requests' },
]

export function getSelfHostedUsageServices(data: UsageApiCounts[], now = dayjs()) {
  const filled = fillTimeseriesSorted({
    data,
    timestampKey: 'timestamp',
    valueKey: SERVICES.map(({ dataKey }) => dataKey as string),
    defaultValue: 0,
    startDate: now.subtract(24, 'hour').toISOString(),
    endDate: now.toISOString(),
    minPointsToFill: 5,
  })

  return {
    error: filled.error,
    services: SERVICES.map((service) => {
      const chartData: LogsBarChartDatum[] = filled.data.map((item) => ({
        timestamp: item.timestamp,
        error_count: 0,
        warning_count: 0,
        ok_count: Number(item[service.dataKey]) || 0,
      }))

      return {
        ...service,
        data: chartData,
        total: chartData.reduce((sum, item) => sum + item.ok_count, 0),
      }
    }),
  }
}

export function SelfHostedUsageSection() {
  const { ref: projectRef } = useParams()
  const { data, isPending, error, refetch, isFetching } = useSelfHostedUsageQuery(projectRef, {
    refetchOnWindowFocus: false,
  })
  const usage = useMemo(() => getSelfHostedUsageServices(data?.result ?? []), [data?.result])
  const requestError = error ?? usage.error
  const totalRequests = usage.services.reduce((sum, service) => sum + service.total, 0)

  return (
    <section aria-labelledby="self-hosted-usage-title" className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="self-hosted-usage-title">Usage</h2>
          <p className="text-sm text-foreground-light">Last 24 hours</p>
        </div>
        {!isPending && !requestError && (
          <div className="text-right">
            <p className="text-xl text-foreground">{totalRequests.toLocaleString()}</p>
            <p className="text-sm text-foreground-light">Total requests</p>
          </div>
        )}
      </div>

      {requestError ? (
        <Card className="bg-transparent">
          <CardContent className="flex min-h-32 flex-col items-start justify-center gap-3 p-6">
            <div>
              <p className="text-sm text-foreground">Usage data is unavailable</p>
              <p className="text-sm text-foreground-light">
                Request counts could not be loaded from Logflare.
              </p>
            </div>
            <Button size="small" type="button" onClick={() => refetch()} loading={isFetching}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Row maxColumns={4} minWidth={280} aria-busy={isPending}>
          {usage.services.map((service) => (
            <Card key={service.key} className="mb-0 flex h-64 flex-col md:mb-0">
              <CardHeader className="flex flex-row items-end justify-between gap-2 space-y-0 border-b-0 pb-0">
                <div className="flex flex-col">
                  <CardTitle className="font-mono text-xs uppercase text-foreground-light">
                    {service.title}
                  </CardTitle>
                  {!isPending && (
                    <span className="text-xl text-foreground">
                      {service.total.toLocaleString()}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-card h-full flex-1 overflow-hidden">
                <Loading isFullHeight active={isPending}>
                  <LogsBarChart
                    isFullHeight
                    data={service.data}
                    error={null}
                    DateTimeFormat="MMM D, ha"
                    hideZeroValues
                    chartConfig={{
                      error_count: { label: 'Errors' },
                      warning_count: { label: 'Warnings' },
                      ok_count: { label: 'Requests' },
                    }}
                    ErrorState={
                      <ChartEmptyState
                        icon={<WarningIcon />}
                        title="Failed to load usage"
                        description="Try again later."
                      />
                    }
                    EmptyState={
                      <NoDataPlaceholder
                        size="small"
                        message="No requests in the last 24 hours"
                        isFullHeight
                      />
                    }
                  />
                </Loading>
              </CardContent>
            </Card>
          ))}
        </Row>
      )}
    </section>
  )
}
