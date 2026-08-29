import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PrivateAppsProvider, usePrivateApps } from './PrivateAppsContext'
import { createMockOrganization, render } from '@/tests/helpers'

const { mockSelectedOrganization, mockPlatformAppsQuery, mockPlatformAppInstallationsQuery } =
  vi.hoisted(() => ({
    mockSelectedOrganization: vi.fn(),
    mockPlatformAppsQuery: vi.fn(),
    mockPlatformAppInstallationsQuery: vi.fn(),
  }))

vi.mock('@/hooks/misc/useSelectedOrganization', () => ({
  useSelectedOrganizationQuery: () => ({ data: mockSelectedOrganization() }),
}))

vi.mock('@/data/platform-apps/platform-apps-query', () => ({
  usePlatformAppsQuery: mockPlatformAppsQuery,
}))

vi.mock('@/data/platform-apps/platform-app-installations-query', () => ({
  usePlatformAppInstallationsQuery: mockPlatformAppInstallationsQuery,
}))

function Consumer() {
  const { isSelfHosted, isLoading, apps, installations } = usePrivateApps()

  return (
    <div>
      <p>{isSelfHosted ? 'self-hosted' : 'cloud'}</p>
      <p>{isLoading ? 'loading' : 'ready'}</p>
      <p>apps:{apps.length}</p>
      <p>installations:{installations.length}</p>
    </div>
  )
}

describe('PrivateAppsProvider self-hosted mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectedOrganization.mockReturnValue(
      createMockOrganization({
        slug: 'default-org-slug',
        integration_source: 'self-hosted',
        plan: { id: 'enterprise', name: 'Self-hosted' },
      })
    )
    mockPlatformAppsQuery.mockReturnValue({ data: undefined, isLoading: false })
    mockPlatformAppInstallationsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    })
  })

  it('disables Cloud platform app reads and returns a local unavailable state', () => {
    render(
      <PrivateAppsProvider>
        <Consumer />
      </PrivateAppsProvider>
    )

    expect(screen.getByText('self-hosted')).toBeInTheDocument()
    expect(screen.getByText('ready')).toBeInTheDocument()
    expect(screen.getByText('apps:0')).toBeInTheDocument()
    expect(screen.getByText('installations:0')).toBeInTheDocument()
    expect(mockPlatformAppsQuery).toHaveBeenCalledWith(
      { slug: 'default-org-slug' },
      { enabled: false }
    )
    expect(mockPlatformAppInstallationsQuery).toHaveBeenCalledWith(
      { slug: 'default-org-slug' },
      { enabled: false, retry: false }
    )
  })
})
