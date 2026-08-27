import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Documents } from './Documents'
import { createMockOrganization, render } from '@/tests/helpers'

const { mockSelectedOrganization, mockCustomContent } = vi.hoisted(() => ({
  mockSelectedOrganization: vi.fn(),
  mockCustomContent: vi.fn(),
}))

vi.mock('@/hooks/misc/useSelectedOrganization', () => ({
  useSelectedOrganizationQuery: () => ({ data: mockSelectedOrganization() }),
}))

vi.mock('@/hooks/custom-content/useCustomContent', () => ({
  useCustomContent: () => mockCustomContent(),
}))

describe('Documents self-hosted mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectedOrganization.mockReturnValue(
      createMockOrganization({
        slug: 'default-org-slug',
        integration_source: 'self-hosted',
        plan: { id: 'enterprise', name: 'Self-hosted' },
      })
    )
    mockCustomContent.mockReturnValue({})
  })

  it('keeps legal documents visible without rendering Cloud-only request actions', () => {
    render(<Documents />)

    expect(screen.getByText('Data Processing Addendum')).toBeInTheDocument()
    expect(screen.getByText('Transfer Impact Assessment')).toBeInTheDocument()
    expect(screen.getByText('Self-hosted compliance documents')).toBeInTheDocument()
    expect(screen.getByText('Open DPA reference')).toHaveAttribute(
      'href',
      'https://supabase.com/downloads/docs/Supabase+DPA+260601.pdf'
    )
    expect(screen.queryByText('Request DPA')).not.toBeInTheDocument()
    expect(screen.queryByText('Download SOC2')).not.toBeInTheDocument()
  })
})
