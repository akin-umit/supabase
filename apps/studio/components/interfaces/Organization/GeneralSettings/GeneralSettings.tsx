import { Badge, Card, CardContent } from 'ui'
import {
  PageSection,
  PageSectionContent,
  PageSectionMeta,
  PageSectionSummary,
  PageSectionTitle,
} from 'ui-patterns/PageSection'

import { DataPrivacyForm } from './DataPrivacyForm'
import { OrganizationDeletePanel } from './OrganizationDeletePanel'
import { OrganizationDetailsForm } from './OrganizationDetailsForm'
import { NoProjectsOnPaidOrgInfo } from '@/components/interfaces/Billing/NoProjectsOnPaidOrgInfo'
import { useOrgProjectsInfiniteQuery } from '@/data/projects/org-projects-infinite-query'
import { useIsFeatureEnabled } from '@/hooks/misc/useIsFeatureEnabled'
import { useSelectedOrganizationQuery } from '@/hooks/misc/useSelectedOrganization'

export const GeneralSettings = () => {
  const organizationDeletionEnabled = useIsFeatureEnabled('organizations:delete')
  const { data: organization } = useSelectedOrganizationQuery()
  const isSelfHosted = organization?.integration_source === 'self-hosted'

  return (
    <>
      {!isSelfHosted && <NoProjectsOnPaidOrgInfo />}

      <PageSection>
        <PageSectionMeta>
          <PageSectionSummary>
            <PageSectionTitle>Organization details</PageSectionTitle>
          </PageSectionSummary>
        </PageSectionMeta>
        <PageSectionContent>
          <OrganizationDetailsForm />
        </PageSectionContent>
      </PageSection>

      {isSelfHosted ? <SelfHostedControlPlaneSection /> : (
        <PageSection>
          <PageSectionMeta>
            <PageSectionSummary>
              <PageSectionTitle>Data privacy</PageSectionTitle>
            </PageSectionSummary>
          </PageSectionMeta>
          <PageSectionContent>
            <DataPrivacyForm />
          </PageSectionContent>
        </PageSection>
      )}

      {organizationDeletionEnabled && (
        <PageSection>
          <PageSectionMeta>
            <PageSectionSummary>
              <PageSectionTitle>Danger zone</PageSectionTitle>
            </PageSectionSummary>
          </PageSectionMeta>
          <PageSectionContent>
            <OrganizationDeletePanel />
          </PageSectionContent>
        </PageSection>
      )}
    </>
  )
}

const SelfHostedControlPlaneSection = () => {
  const { data: organization } = useSelectedOrganizationQuery()
  const { data } = useOrgProjectsInfiniteQuery({ slug: organization?.slug })
  const projects = data?.pages.flatMap((page) => page.projects) ?? []
  const getDomains = (project: (typeof projects)[number]) =>
    ((project as any).app_config?.custom_domains ?? []) as string[]
  const domains = projects.flatMap(getDomains)

  return (
    <PageSection>
      <PageSectionMeta>
        <PageSectionSummary>
          <PageSectionTitle>Self-host control plane</PageSectionTitle>
        </PageSectionSummary>
      </PageSectionMeta>
      <PageSectionContent>
        <Card>
          <CardContent className="py-6 space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <p className="text-sm text-foreground-light">Projects</p>
                <p className="text-2xl text-foreground">{projects.length}</p>
              </div>
              <div>
                <p className="text-sm text-foreground-light">Domains</p>
                <p className="text-2xl text-foreground">{domains.length}</p>
              </div>
              <div>
                <p className="text-sm text-foreground-light">Runtime apply mode</p>
                <Badge variant="warning">Operator-managed</Badge>
              </div>
            </div>
            <div className="space-y-2">
              {projects.map((project) => (
                <div key={project.ref} className="flex items-center justify-between gap-3 border-t pt-3">
                  <div>
                    <p className="text-sm text-foreground">{project.name}</p>
                    <p className="text-xs text-foreground-light">{project.ref}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {getDomains(project).map((domain) => (
                      <Badge key={domain} variant="default">{domain}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-foreground-light">
              Organization, project, team, role, domain, and usage data are now served by the
              self-host platform API. Runtime-changing actions still require the audited VPS apply
              worker that writes compose/env changes and restarts affected services.
            </p>
          </CardContent>
        </Card>
      </PageSectionContent>
    </PageSection>
  )
}
