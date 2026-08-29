import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuditLogs } from './AuditLogs'
import { createMockOrganization, render } from '@/tests/helpers'

const { mockSelectedOrganization, mockAuditLogsQuery } = vi.hoisted(() => ({
  mockSelectedOrganization: vi.fn(),
  mockAuditLogsQuery: vi.fn(),
}))

vi.mock('@/hooks/misc/useSelectedOrganization', () => ({
  useSelectedOrganizationQuery: () => ({ data: mockSelectedOrganization() }),
}))

vi.mock('@/hooks/misc/useCheckPermissions', () => ({
  useAsyncCheckPermissions: () => ({ can: true, isLoading: false }),
}))

vi.mock('@/hooks/misc/useCheckEntitlements', () => ({
  useCheckEntitlements: () => ({ hasAccess: true, isLoading: false }),
}))

vi.mock('@/data/organizations/organization-audit-logs-query', () => ({
  TIMESTAMP_MICROS_PER_MS: 1000,
  useOrganizationAuditLogsQuery: mockAuditLogsQuery,
}))

describe('AuditLogs self-hosted mode', () => {
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

  it('shows the local bridge contract instead of calling Cloud audit log APIs', () => {
    render(<AuditLogs />)

    expect(screen.getByText('Self-hosted audit log bridge required')).toBeInTheDocument()
    expect(screen.getByText(/does not call Cloud audit log APIs/i)).toBeInTheDocument()
    expect(mockAuditLogsQuery).not.toHaveBeenCalled()
  })
})
