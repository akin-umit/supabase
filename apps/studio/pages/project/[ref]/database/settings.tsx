import { IS_PLATFORM, useFlag } from 'common'
import { PageContainer } from 'ui-patterns/PageContainer'
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderMeta,
  PageHeaderSummary,
  PageHeaderTitle,
} from 'ui-patterns/PageHeader'

import { useIsJitDbAccessEnabled } from '@/components/interfaces/App/FeaturePreview/FeaturePreviewContext'
import { DiskManagementPanelForm } from '@/components/interfaces/DiskManagement/DiskManagementPanelForm'
import { BannedIPs } from '@/components/interfaces/Settings/Database/BannedIPs'
import { ConnectionLogging } from '@/components/interfaces/Settings/Database/ConnectionLogging'
import { ConnectionPooling } from '@/components/interfaces/Settings/Database/ConnectionPooling/ConnectionPooling'
import { DatabaseReadOnlyAlert } from '@/components/interfaces/Settings/Database/DatabaseReadOnlyAlert'
import { ResetDbPassword } from '@/components/interfaces/Settings/Database/DatabaseSettings/ResetDbPassword'
import { DiskSizeConfiguration } from '@/components/interfaces/Settings/Database/DiskSizeConfiguration'
import { JitDbAccessConfiguration } from '@/components/interfaces/Settings/Database/JitDatabaseAccess/JitDbAccessConfiguration'
import { NetworkRestrictions } from '@/components/interfaces/Settings/Database/NetworkRestrictions/NetworkRestrictions'
import { PoolingModesModal } from '@/components/interfaces/Settings/Database/PoolingModesModal'
import { SettingsDatabaseEmptyStateLocal } from '@/components/interfaces/Settings/Database/SettingsDatabaseEmptyStateLocal'
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
          <SettingsDatabaseEmptyStateLocal />
        ) : (
          <>
            <DatabaseReadOnlyAlert />
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

DatabaseSettings.getLayout = (page) => (
  <DefaultLayout>
    <DatabaseLayout title="Settings">{page}</DatabaseLayout>
  </DefaultLayout>
)

export default DatabaseSettings
