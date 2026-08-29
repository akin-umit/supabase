import { describe, expect, it } from 'vitest'

import {
  getAnalyticsNamespaceDefaultTargetSchema,
  hasAnalyticsNamespaceSchemaClash,
} from './AnalyticsBucketDetails.utils'

describe('analytics bucket schema helpers', () => {
  it('derives the default target schema from the namespace', () => {
    expect(getAnalyticsNamespaceDefaultTargetSchema('events-prod')).toBe('fdw_analytics_events_prod')
  })

  it('treats an unavailable schema list as a clash to avoid presenting a fake safe write path', () => {
    expect(hasAnalyticsNamespaceSchemaClash(undefined, 'fdw_analytics_events_prod')).toBe(true)
  })

  it('detects a real target schema clash', () => {
    expect(
      hasAnalyticsNamespaceSchemaClash(
        [{ name: 'public' }, { name: 'fdw_analytics_events_prod' }],
        'fdw_analytics_events_prod'
      )
    ).toBe(true)
    expect(hasAnalyticsNamespaceSchemaClash([{ name: 'public' }], 'fdw_analytics_events_prod')).toBe(
      false
    )
  })
})
