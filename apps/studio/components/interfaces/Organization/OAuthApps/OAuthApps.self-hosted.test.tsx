import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OAuthApps } from './OAuthApps'
import { createMockOrganization, render } from '@/tests/helpers'

const { mockSelectedOrganization, mockOAuthAppsQuery, mockAuthorizedAppsQuery } = vi.hoisted(() => ({
  mockSelectedOrganization: vi.fn(),
  mockOAuthAppsQuery: vi.fn(),
  mockAuthorizedAppsQuery: vi.fn(),
}))

vi.mock('@/hooks/misc/useSelectedOrganization', () => ({
  useSelectedOrganizationQuery: () => ({ data: mockSelectedOrganization() }),
}))

vi.mock('@/hooks/misc/useCheckPermissions', () => ({
  useAsyncCheckPermissions: () => ({ can: true, isLoading: false }),
}))

vi.mock('@/data/oauth/oauth-apps-query', () => ({
  useOAuthAppsQuery: mockOAuthAppsQuery,
}))

vi.mock('@/data/oauth/authorized-apps-query', () => ({
  useAuthorizedAppsQuery: mockAuthorizedAppsQuery,
}))

describe('OAuthApps self-hosted mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectedOrganization.mockReturnValue(
      createMockOrganization({
        slug: 'default-org-slug',
        integration_source: 'self-hosted',
        plan: { id: 'enterprise', name: 'Self-hosted' },
      })
    )
  })

  it('shows the local bridge contract instead of calling Cloud OAuth app APIs', () => {
    render(<OAuthApps />)

    expect(screen.getByText('Self-hosted OAuth app registry required')).toBeInTheDocument()
    expect(screen.getByText(/does not call Supabase Cloud OAuth APIs/i)).toBeInTheDocument()
    expect(mockOAuthAppsQuery).not.toHaveBeenCalled()
    expect(mockAuthorizedAppsQuery).not.toHaveBeenCalled()
  })
})
