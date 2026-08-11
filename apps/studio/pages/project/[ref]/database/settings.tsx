import { IS_PLATFORM, useFlag } from 'common'
import { Card, CardContent, Badge } from 'ui'
import { PageContainer } from 'ui-patterns/PageContainer'
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderMeta,
  PageHeaderSummary,
  PageHeaderTitle,
} from 'ui-patterns/PageHeader'
import {
  PageSection,
  PageSectionContent,
  PageSectionMeta,
  PageSectionSummary,
  PageSectionTitle,
} from 'ui-patterns/PageSection'

import { useIsJitDbAccessEnabled } from '@/components/interfaces/App/FeaturePreview/FeaturePreviewContext'
import { DiskManagementPanelForm } from '@/components/interfaces/DiskManagement/DiskManagementPanelForm'
import { BannedIPs } from '@/components/interfaces/Settings/Database/BannedIPs'
import { ConnectionLogging } from '@/components/interfaces/Settings/Database/ConnectionLogging'
import { ConnectionPooling } from '@/components/interfaces/Settings/Database/ConnectionPooling/ConnectionPooling'
import { ResetDbPassword } from '@/components/interfaces/Settings/Database/DatabaseSettings/ResetDbPassword'
import { DiskSizeConfiguration } from '@/components/interfaces/Settings/Database/DiskSizeConfiguration'
import { JitDbAccessConfiguration } from '@/components/interfaces/Settings/Database/JitDatabaseAccess/JitDbAccessConfiguration'
import { NetworkRestrictions } from '@/components/interfaces/Settings/Database/NetworkRestrictions/NetworkRestrictions'
import { PoolingModesModal } from '@/components/interfaces/Settings/Database/PoolingModesModal'
import { SSLConfiguration } from '@/components/interfaces/Settings/Database/SSLConfiguration'
import DatabaseLayout from '@/components/layouts/DatabaseLayout/DatabaseLayout'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { useIsFeatureEnabled } from '@/hooks/misc/useIsFeatureEnabled'
import { useIsAwsCloudProvider, useIsAwsK8sCloudProvider } from '@/hooks/misc/useSelectedProject'
import type { NextPageWithLayout } from '@/types'

const DatabaseSettings: NextPageWithLayout = () => {
  const isAws = useIsAwsCloudProvider()
  const isAwsK8s = useIsAwsK8sCloudProvider()
  const jitDbAccessEnabled = useIsJitDbAccessEnabled()
  const showNewDiskManagementUI = isAws || isAwsK8s
  const { databaseNetworkRestrictions } = useIsFeatureEnabled(['database:network_restrictions'])
  const databaseLogsConfigurationEnabled = useFlag('databaseLogsConfiguration')

  return (
    <>
      <PageHeader size="small">
        <PageHeaderMeta>
          <PageHeaderSummary>
            <PageHeaderTitle>Database Settings</PageHeaderTitle>
            <PageHeaderDescription>
              Connections, security, and network configuration
            </PageHeaderDescription>
          </PageHeaderSummary>
        </PageHeaderMeta>
      </PageHeader>
      <PageContainer size="small" className="flex flex-col gap-8 pb-12">
        {!IS_PLATFORM ? (
          <>
            <ConnectionLogging />
            <SelfHostedDatabaseSettingsSurface />
          </>
        ) : (
          <>
            <ResetDbPassword />
            {jitDbAccessEnabled && <JitDbAccessConfiguration />}
            <ConnectionPooling />
            <SSLConfiguration />
            {showNewDiskManagementUI ? (
              // This form is hidden if Disk and Compute form is enabled, new form is on ./settings/compute-and-disk
              <DiskManagementPanelForm />
            ) : (
              <DiskSizeConfiguration />
            )}
            {databaseNetworkRestrictions && <NetworkRestrictions />}
            {databaseLogsConfigurationEnabled && <ConnectionLogging />}
            <BannedIPs />
          </>
        )}
      </PageContainer>
      {IS_PLATFORM && <PoolingModesModal />}
    </>
  )
}

const SelfHostedDatabaseSettingsSurface = () => {
  const sections = [
    {
      title: 'Connection pooling',
      status: 'Operator-managed',
      description:
        'Pooler sizing is read from the local Supavisor/PgBouncer runtime. Studio does not write pooler capacity until the self-host management API exposes PATCH /v1/projects/:ref/database/pooling.',
    },
    {
      title: 'SSL enforcement',
      status: 'Operator-managed',
      description:
        'SSL enforcement depends on the local Postgres listener and certificate bundle. Configure it in the VPS runtime, then verify connection behavior from Studio.',
    },
    {
      title: 'Network restrictions',
      status: 'Local infrastructure',
      description:
        'Self-hosted network allow lists are enforced by the VPS firewall, reverse proxy, or pooler allow_list. Billing-only IPv4 add-on flows are intentionally not shown here.',
    },
    {
      title: 'Disk and read-only controls',
      status: 'Runtime evidence',
      description:
        'Disk usage and read-only state must come from the local database/runtime operations API, not Cloud plan limits. Use Infrastructure/operations telemetry for current status.',
    },
  ]

  return (
    <PageSection id="self-hosted-database-operations">
      <PageSectionMeta>
        <PageSectionSummary>
          <PageSectionTitle>Self-hosted database operations</PageSectionTitle>
        </PageSectionSummary>
      </PageSectionMeta>
      <PageSectionContent>
        <Card>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm">Local database configuration contract</p>
              <p className="text-sm text-foreground-light">
                Editable Postgres settings above save through the self-host management API and
                refetch from Postgres. The remaining Pro database operations below are exposed only
                when the local VPS backend has a real apply/refetch contract.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {sections.map((section) => (
                <div key={section.title} className="rounded border p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{section.title}</p>
                    <Badge variant="default">{section.status}</Badge>
                  </div>
                  <p className="text-sm text-foreground-light">{section.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </PageSectionContent>
    </PageSection>
  )
}

DatabaseSettings.getLayout = (page) => (
  <DefaultLayout>
    <DatabaseLayout title="Settings">{page}</DatabaseLayout>
  </DefaultLayout>
)

export default DatabaseSettings
