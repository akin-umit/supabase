import { Badge, Card, CardContent, cn } from 'ui'

import PaymentMethods from '../../Billing/Payment/PaymentMethods/PaymentMethods'
import { InvoicesSection } from '../InvoicesSettings/InvoicesSection'
import BillingBreakdown from './BillingBreakdown/BillingBreakdown'
import { BillingCustomerData } from './BillingCustomerData/BillingCustomerData'
import BillingEmail from './BillingEmail'
import CostControl from './CostControl/CostControl'
import CreditBalance from './CreditBalance'
import Subscription from './Subscription/Subscription'
import {
  ScaffoldContainer,
  ScaffoldContainerLegacy,
  ScaffoldDivider,
  ScaffoldTitle,
} from '@/components/layouts/Scaffold'
import { useOrgProjectsInfiniteQuery } from '@/data/projects/org-projects-infinite-query'
import { useOrgSubscriptionQuery } from '@/data/subscriptions/org-subscription-query'
import { useIsFeatureEnabled } from '@/hooks/misc/useIsFeatureEnabled'
import { useSelectedOrganizationQuery } from '@/hooks/misc/useSelectedOrganization'
import { MANAGED_BY } from '@/lib/constants/infrastructure'

export const BillingSettings = () => {
  const {
    billingAccountData: isBillingAccountDataEnabledOnProfileLevel,
    billingPaymentMethods: isBillingPaymentMethodsEnabledOnProfileLevel,
    billingCredits: isBillingCreditsEnabledOnProfileLevel,
    billingInvoices: isBillingInvoicesEnabledOnProfileLevel,
  } = useIsFeatureEnabled([
    'billing:account_data',
    'billing:payment_methods',
    'billing:credits',
    'billing:invoices',
  ])

  const { data: org } = useSelectedOrganizationQuery()
  const { data: subscription } = useOrgSubscriptionQuery({ orgSlug: org?.slug })
  const isSelfHosted = org?.integration_source === 'self-hosted'
  const isNotOrgWithPartnerBilling = !subscription?.billing_via_partner
  const isStripeOrg = org?.managed_by === MANAGED_BY.STRIPE_PROJECTS

  const billingAccountDataEnabled =
    isBillingAccountDataEnabledOnProfileLevel && isNotOrgWithPartnerBilling
  const billingPaymentMethodsEnabled =
    isBillingPaymentMethodsEnabledOnProfileLevel && (isNotOrgWithPartnerBilling || isStripeOrg)

  if (isSelfHosted) {
    return <SelfHostedBillingSettings />
  }

  return (
    <>
      <ScaffoldContainerLegacy>
        <ScaffoldTitle>Billing</ScaffoldTitle>
      </ScaffoldContainerLegacy>

      <ScaffoldContainer id="subscription" className={cn('[&>div]:pt-0!')}>
        <Subscription />
      </ScaffoldContainer>

      <ScaffoldDivider />

      <ScaffoldContainer id="cost-control">
        <CostControl />
      </ScaffoldContainer>

      <ScaffoldDivider />

      {org && org.plan.id !== 'free' && (
        <ScaffoldContainer id="breakdown">
          <BillingBreakdown />
        </ScaffoldContainer>
      )}

      {isBillingInvoicesEnabledOnProfileLevel && (
        <>
          <ScaffoldDivider />
          <ScaffoldContainer id="invoices">
            <InvoicesSection />
          </ScaffoldContainer>
        </>
      )}

      {billingPaymentMethodsEnabled && (
        <>
          <ScaffoldDivider />

          <ScaffoldContainer id="payment-methods">
            <PaymentMethods />
          </ScaffoldContainer>
        </>
      )}

      {isBillingCreditsEnabledOnProfileLevel && (
        <>
          <ScaffoldDivider />

          <ScaffoldContainer id="credits-balance">
            <CreditBalance />
          </ScaffoldContainer>
        </>
      )}

      {billingAccountDataEnabled && (
        <>
          <ScaffoldDivider />

          <ScaffoldContainer id="email">
            <BillingEmail />
          </ScaffoldContainer>

          <ScaffoldDivider />

          <ScaffoldContainer id="address">
            <BillingCustomerData />
          </ScaffoldContainer>
        </>
      )}
    </>
  )
}

const SelfHostedBillingSettings = () => {
  const { data: org } = useSelectedOrganizationQuery()
  const { data: subscription } = useOrgSubscriptionQuery({ orgSlug: org?.slug })
  const { data: projectsData } = useOrgProjectsInfiniteQuery({ slug: org?.slug })

  const projectCount =
    projectsData?.pages.reduce((count, page) => count + page.projects.length, 0) ?? 0
  const planName = subscription?.plan.name ?? org?.plan.name ?? 'Self-hosted'

  return (
    <>
      <ScaffoldContainerLegacy>
        <ScaffoldTitle>Billing</ScaffoldTitle>
      </ScaffoldContainerLegacy>

      <ScaffoldContainer id="self-hosted-billing">
        <Card>
          <CardContent className="py-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-base text-foreground">Self-hosted control plane</p>
                <p className="text-sm text-foreground-light">
                  Billing, invoices, payment methods, credits, and Supabase Cloud plan changes are
                  not used in VPS mode. Capacity and paid feature access are managed by the VPS
                  deployment.
                </p>
              </div>
              <Badge variant="warning">VPS-managed</Badge>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded border p-3">
                <p className="text-sm text-foreground-light">Plan</p>
                <p className="text-xl text-foreground">{planName}</p>
              </div>
              <div className="rounded border p-3">
                <p className="text-sm text-foreground-light">Projects</p>
                <p className="text-xl text-foreground">{projectCount}</p>
              </div>
              <div className="rounded border p-3">
                <p className="text-sm text-foreground-light">Usage billing</p>
                <p className="text-xl text-foreground">Disabled</p>
              </div>
            </div>

            <p className="text-sm text-foreground-light">
              Use Organization Usage for local resource telemetry. Runtime-changing actions go
              through the audited VPS apply worker that writes environment and compose changes for
              the target project.
            </p>
          </CardContent>
        </Card>
      </ScaffoldContainer>
    </>
  )
}
