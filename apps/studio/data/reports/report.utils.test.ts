import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchLogs } from './report.utils'
import { executeAnalyticsSql } from '@/data/logs/execute-analytics-sql'
import { safeSql } from '@/data/logs/safe-analytics-sql'

vi.mock('@/data/logs/execute-analytics-sql', () => ({
  executeAnalyticsSql: vi.fn(),
}))

describe('fetchLogs', () => {
  beforeEach(() => {
    vi.mocked(executeAnalyticsSql).mockResolvedValue({ result: [] })
  })

  it('can route report queries through the OTEL logs endpoint', async () => {
    await fetchLogs(
      'project-ref',
      safeSql`select 1`,
      '2026-08-23T00:00:00.000Z',
      '2026-08-23T01:00:00.000Z',
      { useOtel: true }
    )

    expect(executeAnalyticsSql).toHaveBeenCalledWith(
      expect.objectContaining({
        projectRef: 'project-ref',
        endpoint: '/platform/projects/{ref}/analytics/endpoints/logs.all.otel',
      })
    )
  })
})
