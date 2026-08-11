import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { retrieveAnalyticsData } from '@/lib/api/self-hosted/logs'
import { IS_PLATFORM } from '@/lib/constants'

const infraMonitoringHandler = (req: NextApiRequest, res: NextApiResponse) =>
  apiWrapper(req, res, handler)

export default infraMonitoringHandler

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'GET':
      return handleGetAll(req, res)
    default:
      res.setHeader('Allow', ['GET'])
      res.status(405).json({ data: null, error: { message: `Method ${method} Not Allowed` } })
  }
}

function getString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getAttributes(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value.join(',') : value
  return (raw ?? '')
    .split(',')
    .map((attribute) => attribute.trim())
    .filter(Boolean)
}

const INTERVAL_GRANULARITY: Record<string, string> = {
  '1m': 'minute',
  '2m': 'minute',
  '5m': 'minute',
  '10m': 'minute',
  '30m': 'minute',
  '1h': 'hour',
  '1d': 'day',
}

function realtimeActivitySql(interval: string) {
  const granularity = INTERVAL_GRANULARITY[interval] ?? 'hour'
  return `
    select
      timestamp_trunc(timestamp, ${granularity}) as period_start,
      count(id) as value
    from realtime_logs
    group by period_start
    order by period_start asc
  `
}

const LOCAL_LOG_DERIVED_ATTRIBUTES = new Set([
  'realtime_sum_connections_connected',
  'realtime_channel_events',
  'realtime_channel_presence_events',
  'realtime_channel_db_events',
  'realtime_channel_joins',
  'realtime_payload_size',
  'realtime_replication_connection_lag',
  'realtime_read_authorization_rls_execution_time',
  'realtime_write_authorization_rls_execution_time',
])

function emptyInfraMonitoringResponse(attributes: string[], reason?: string) {
  return {
    data: [],
    series: Object.fromEntries(
      attributes.map((attribute) => [
        attribute,
        {
          yAxisLimit: 0,
          format: '',
          total: 0,
          totalAverage: 0,
        },
      ])
    ),
    self_hosted: {
      degraded: Boolean(reason),
      reason,
    },
  }
}

const handleGetAll = async (req: NextApiRequest, res: NextApiResponse) => {
  if (IS_PLATFORM) {
    // Platform specific endpoint
    const response = {
      data: [],
      yAxisLimit: 0,
      format: '%',
      total: 0,
    }
    return res.status(200).json(response)
  }

  const attributes = getAttributes(req.query.attributes)
  const unsupported = attributes.filter((attribute) => !LOCAL_LOG_DERIVED_ATTRIBUTES.has(attribute))

  if (attributes.length === 0) {
    return res.status(400).json({ error: { message: 'At least one attribute is required' } })
  }

  if (unsupported.length > 0) {
    return res
      .status(200)
      .json(
        emptyInfraMonitoringResponse(
          attributes,
          `Unsupported self-hosted infra metrics: ${unsupported.join(', ')}. Host-level CPU, RAM, disk, and pooler metrics require a local metrics collector backend.`
        )
      )
  }

  const projectRef = getString(req.query.ref)
  const startDate = getString(req.query.startDate)
  const endDate = getString(req.query.endDate)
  const interval = getString(req.query.interval) ?? '1h'

  if (!projectRef || !startDate || !endDate) {
    return res
      .status(400)
      .json({ error: { message: 'Project ref, startDate, and endDate are required' } })
  }

  const { data, error } = await retrieveAnalyticsData({
    name: 'logs.all',
    projectRef,
    params: {
      sql: realtimeActivitySql(interval),
      iso_timestamp_start: startDate,
      iso_timestamp_end: endDate,
    },
  })

  if (error) {
    return res
      .status(200)
      .json(
        emptyInfraMonitoringResponse(
          attributes,
          error.message ||
            'Self-hosted infra monitoring data is unavailable. Check Logflare and Vector runtime configuration.'
        )
      )
  }

  const rows = (data?.result ?? []) as Array<{ period_start: string; value: number | string }>
  const series = Object.fromEntries(
    attributes.map((attribute) => [
      attribute,
      {
        yAxisLimit: 0,
        format: '',
        total: rows.reduce((sum, row) => sum + Number(row.value ?? 0), 0),
        totalAverage: 0,
      },
    ])
  )

  const response = {
    data: rows.map((row) => ({
      period_start: row.period_start,
      values: Object.fromEntries(
        attributes.map((attribute) => [attribute, String(row.value ?? 0)])
      ),
    })),
    series,
  }

  return res.status(200).json(response)
}
