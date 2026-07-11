import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useProjectOperationsQuery } from './project-operations-query'
import { useDeploymentMode } from '@/hooks/misc/useDeploymentMode'

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn((options) => options) }))
vi.mock('@/hooks/misc/useDeploymentMode', () => ({ useDeploymentMode: vi.fn() }))

const mockUseDeploymentMode = vi.mocked(useDeploymentMode)

describe('useProjectOperationsQuery', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ['platform', { isPlatform: true, isCli: false, isSelfHosted: false }],
    ['CLI', { isPlatform: false, isCli: true, isSelfHosted: false }],
  ])('is disabled for %s deployments', (_name, mode) => {
    mockUseDeploymentMode.mockReturnValue(mode)

    const { result } = renderHook(() => useProjectOperationsQuery({ projectRef: 'default' }))

    expect((result.current as unknown as { enabled: boolean }).enabled).toBe(false)
  })

  it('is enabled only for a real self-hosted deployment with a project ref', () => {
    mockUseDeploymentMode.mockReturnValue({ isPlatform: false, isCli: false, isSelfHosted: true })

    const { result } = renderHook(() => useProjectOperationsQuery({ projectRef: 'default' }))

    expect((result.current as unknown as { enabled: boolean }).enabled).toBe(true)
  })

  it('honors the caller enabled option', () => {
    mockUseDeploymentMode.mockReturnValue({ isPlatform: false, isCli: false, isSelfHosted: true })

    const { result } = renderHook(() =>
      useProjectOperationsQuery({ projectRef: 'default' }, { enabled: false })
    )

    expect((result.current as unknown as { enabled: boolean }).enabled).toBe(false)
  })
})
