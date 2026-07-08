import { renderHook } from '@testing-library/react'
import { FeatureFlagContext, safeLocalStorage } from 'common'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FeaturePreviewContextProvider, useUnifiedLogsPreview } from './FeaturePreviewContext'

vi.mock('@/lib/constants', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/constants')
  return {
    ...actual,
    IS_PLATFORM: false,
  }
})

vi.mock('common', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('common')
  return {
    ...actual,
    useFlag: vi.fn().mockReturnValue(true),
  }
})

const wrapper = ({ children }: PropsWithChildren) => (
  <FeatureFlagContext.Provider value={{ configcat: {}, posthog: {}, hasLoaded: true }}>
    <FeaturePreviewContextProvider>{children}</FeaturePreviewContextProvider>
  </FeatureFlagContext.Provider>
)

describe('useUnifiedLogsPreview (self-hosted)', () => {
  beforeEach(() => {
    safeLocalStorage.clear()
  })

  it('never reports unified logs as enabled, even when the feature flags are on', () => {
    const { result } = renderHook(() => useUnifiedLogsPreview(), { wrapper })

    expect(result.current.isEnabled).toBe(false)
    expect(result.current.isDefaultOptIn).toBe(false)
  })
})
