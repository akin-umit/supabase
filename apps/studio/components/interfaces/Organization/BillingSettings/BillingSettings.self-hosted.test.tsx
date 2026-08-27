import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BillingSettings } from './BillingSettings'
import { createMockOrganization, render } from '@/tests/helpers'

const {
  mockSelectedOrganization,
  mockSubscriptionQuery,
  mockOrgProjectsQuery,
  mockSubscriptionRender,
  mockCostControlRender,
  mockPaymentMethodsRender,
  mockInvoicesRender,
  mockBillingBreakdownRender,
} = vi.hoisted(() => ({
  mockSelectedOrganization: vi.fn(),
  mockSubscriptionQuery: vi.fn(),
  mockOrgProjectsQuery: vi.fn(),
  mockSubscriptionRender: vi.fn(),
  mockCostControlRender: vi.fn(),
  mockPaymentMethodsRender: vi.fn(),
  mockInvoicesRender: vi.fn(),
  mockBillingBreakdownRender: vi.fn(),
}))

vi.mock('@/hooks/misc/useSelectedOrganization', () => ({
  useSelectedOrganizationQuery: () => ({ data: mockSelectedOrganization() }),
}))

vi.mock('@/hooks/misc/useIsFeatureEnabled', () => ({
  useIsFeatureEnabled: () => ({
    billingAccountData: true,
    billingPaymentMethods: true,
    billingCredits: true,
    billingInvoices: true,
  }),
}))

vi.mock('@/data/subscriptions/org-subscription-query', () => ({
  useOrgSubscriptionQuery: () => ({ data: mockSubscriptionQuery() }),
}))

vi.mock('@/data/projects/org-projects-infinite-query', () => ({
  useOrgProjectsInfiniteQuery: () => ({ data: mockOrgProjectsQuery() }),
}))

vi.mock('./Subscription/Subscription', () => ({
  default: () => {
    mockSubscriptionRender()
    return <div>cloud subscription panel</div>
  },
}))

vi.mock('./CostControl/CostControl', () => ({
  default: () => {
    mockCostControlRender()
    return <div>cloud cost control panel</div>
  },
}))

vi.mock('../../Billing/Payment/PaymentMethods/PaymentMethods', () => ({
  default: () => {
    mockPaymentMethodsRender()
    return <div>cloud payment methods panel</div>
  },
}))

vi.mock('../InvoicesSettings/InvoicesSection', () => ({
  InvoicesSection: () => {
    mockInvoicesRender()
    return <div>cloud invoices panel</div>
  },
}))

vi.mock('./BillingBreakdown/BillingBreakdown', () => ({
  default: () => {
    mockBillingBreakdownRender()
    return <div>cloud billing breakdown panel</div>
  },
}))

vi.mock('./BillingEmail', () => ({ default: () => <div>cloud billing email panel</div> }))
vi.mock('./BillingCustomerData/BillingCustomerData', () => ({
  BillingCustomerData: () => <div>cloud billing customer data panel</div>,
}))
vi.mock('./CreditBalance', () => ({ default: () => <div>cloud credit balance panel</div> }))

describe('BillingSettings self-hosted mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectedOrganization.mockReturnValue(
      createMockOrganization({
        slug: 'default-org-slug',
        integration_source: 'self-hosted',
        plan: { id: 'enterprise', name: 'Self-hosted' },
      })
    )
    mockSubscriptionQuery.mockReturnValue({
      payment_method_type: 'self-hosted',
      billing_via_partner: false,
      plan: { id: 'enterprise', name: 'Self-hosted' },
      usage_billing_enabled: false,
    })
    mockOrgProjectsQuery.mockReturnValue({
      pages: [
        {
          projects: [
            { ref: 'default', name: 'Aqenta Self Hosted Supabase' },
            { ref: 'preview', name: 'Preview Project' },
          ],
        },
      ],
    })
  })

  it('renders the local VPS-managed billing state instead of Cloud billing panels', () => {
    render(<BillingSettings />)

    expect(screen.getByText('Self-hosted control plane')).toBeInTheDocument()
    expect(screen.getByText('VPS-managed')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Usage billing')).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()

    expect(mockSubscriptionRender).not.toHaveBeenCalled()
    expect(mockCostControlRender).not.toHaveBeenCalled()
    expect(mockPaymentMethodsRender).not.toHaveBeenCalled()
    expect(mockInvoicesRender).not.toHaveBeenCalled()
    expect(mockBillingBreakdownRender).not.toHaveBeenCalled()
  })
})
