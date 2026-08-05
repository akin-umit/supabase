import { useParams } from 'common'

import { AnalyticsBuckets } from '@/components/interfaces/Storage/AnalyticsBuckets'
import { BucketsUpgradePlan } from '@/components/interfaces/Storage/BucketsUpgradePlan'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { StorageBucketsLayout } from '@/components/layouts/StorageLayout/StorageBucketsLayout'
import StorageLayout from '@/components/layouts/StorageLayout/StorageLayout'
import { useIsAnalyticsBucketsEnabled } from '@/data/config/project-storage-config-query'
import { useDeploymentMode } from '@/hooks/misc/useDeploymentMode'
import type { NextPageWithLayout } from '@/types'

const StorageAnalyticsPage: NextPageWithLayout = () => {
  const { ref: projectRef } = useParams()
  const { isSelfHosted } = useDeploymentMode()
  const isAnalyticsBucketsEnabled = useIsAnalyticsBucketsEnabled({ projectRef })

  if (isSelfHosted) {
    return null
  } else if (!isAnalyticsBucketsEnabled) {
    return <BucketsUpgradePlan type="analytics" />
  } else {
    return <AnalyticsBuckets />
  }
}

StorageAnalyticsPage.getLayout = (page) => (
  <DefaultLayout>
    <StorageLayout title="Analytics">
      <StorageBucketsLayout>{page}</StorageBucketsLayout>
    </StorageLayout>
  </DefaultLayout>
)

export default StorageAnalyticsPage
