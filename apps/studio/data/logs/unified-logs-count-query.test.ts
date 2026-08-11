import { describe, expect, it, vi } from 'vitest'

import { executeAnalyticsSql } from './execute-analytics-sql'
import { getUnifiedLogsCount } from './unified-logs-count-query'

vi.mock('./execute-analytics-sql', () => ({
  executeAnalyticsSql: vi.fn(),
}))

describe('getUnifiedLogsCount', () => {
  it('accepts legacy BigQuery count rows that use dimension instead of facet', async () => {
    vi.mocked(executeAnalyticsSql).mockResolvedValueOnce({
      result: [
        { dimension: 'total', value: 'all', count: 7 },
        { dimension: 'log_type', value: 'postgres', count: 4 },
        { dimension: 'level', value: 'error', count: 3 },
      ],
    } as any)

    const result = await getUnifiedLogsCount({
      projectRef: 'default',
      search: {
        date: [new Date('2026-08-11T00:00:00.000Z'), new Date('2026-08-11T01:00:00.000Z')],
      } as any,
      useOtel: false,
    })

    expect(result.totalRowCount).toBe(7)
    expect(result.facets.log_type.rows).toEqual([{ value: 'postgres', total: 4 }])
    expect(result.facets.level.rows).toEqual([{ value: 'error', total: 3 }])
  })
})
