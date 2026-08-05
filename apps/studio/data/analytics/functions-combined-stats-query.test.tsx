import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useFunctionsCombinedStatsQuery } from './functions-combined-stats-query'
import { useDeploymentMode } from '@/hooks/misc/useDeploymentMode'

const { mockIsPlatform } = vi.hoisted(() => ({
  mockIsPlatform: { value: false },
}))

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn((options) => options) }))
vi.mock('@/hooks/misc/useDeploymentMode', () => ({ useDeploymentMode: vi.fn() }))
vi.mock('@/lib/constants', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/constants')
  return {
    ...actual,
    get IS_PLATFORM() {
      return mockIsPlatform.value
    },
  }
})

const mockUseDeploymentMode = vi.mocked(useDeploymentMode)

describe('useFunctionsCombinedStatsQuery', () => {
  beforeEach(() => {
    mockIsPlatform.value = false
    vi.clearAllMocks()
  })

  it('is enabled for hosted platform analytics', () => {
    mockIsPlatform.value = true
    mockUseDeploymentMode.mockReturnValue({ isPlatform: true, isCli: false, isSelfHosted: false })

    const { result } = renderHook(() =>
      useFunctionsCombinedStatsQuery({
        projectRef: 'default',
        functionId: 'self-host-smoke',
        interval: '15min',
      })
    )

    expect((result.current as unknown as { enabled: boolean }).enabled).toBe(true)
  })

  it('is enabled for self-hosted analytics', () => {
    mockUseDeploymentMode.mockReturnValue({ isPlatform: false, isCli: false, isSelfHosted: true })

    const { result } = renderHook(() =>
      useFunctionsCombinedStatsQuery({
        projectRef: 'default',
        functionId: 'self-host-smoke',
        interval: '15min',
      })
    )

    expect((result.current as unknown as { enabled: boolean }).enabled).toBe(true)
  })

  it('stays disabled when required parameters are missing', () => {
    mockUseDeploymentMode.mockReturnValue({ isPlatform: false, isCli: false, isSelfHosted: true })

    const { result } = renderHook(() =>
      useFunctionsCombinedStatsQuery({
        projectRef: 'default',
        functionId: undefined,
        interval: '15min',
      })
    )

    expect((result.current as unknown as { enabled: boolean }).enabled).toBe(false)
  })

  it('honors the caller enabled option', () => {
    mockUseDeploymentMode.mockReturnValue({ isPlatform: false, isCli: false, isSelfHosted: true })

    const { result } = renderHook(() =>
      useFunctionsCombinedStatsQuery(
        {
          projectRef: 'default',
          functionId: 'self-host-smoke',
          interval: '15min',
        },
        { enabled: false }
      )
    )

    expect((result.current as unknown as { enabled: boolean }).enabled).toBe(false)
  })
})
