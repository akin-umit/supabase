import { IS_PLATFORM, useParams } from 'common'
import { Admonition } from 'ui-patterns/admonition'
import { PageContainer } from 'ui-patterns/PageContainer'
import { PageSection, PageSectionContent } from 'ui-patterns/PageSection'

import { BucketsUpgradePlan } from '@/components/interfaces/Storage/BucketsUpgradePlan'
import { VectorsBuckets } from '@/components/interfaces/Storage/VectorBuckets'
import {
  RegionLimitation,
  VECTOR_BUCKETS_AVAILABLE_REGIONS,
} from '@/components/interfaces/Storage/VectorBuckets/RegionLimitation'
import { VectorBucketsLocalDisabledState } from '@/components/interfaces/Storage/VectorBuckets/VectorBucketsLocalDisabledState'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { StorageBucketsLayout } from '@/components/layouts/StorageLayout/StorageBucketsLayout'
import StorageLayout from '@/components/layouts/StorageLayout/StorageLayout'
import { useIsVectorBucketsEnabled } from '@/data/config/project-storage-config-query'
import { useDeploymentMode } from '@/hooks/misc/useDeploymentMode'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'
import type { NextPageWithLayout } from '@/types'

const StorageVectorsPage: NextPageWithLayout = () => {
  const { ref: projectRef } = useParams()
  const { data: project } = useSelectedProjectQuery()
  const { isSelfHosted } = useDeploymentMode()
  const isVectorBucketsEnabled = useIsVectorBucketsEnabled({ projectRef })

  // [Joshen] We're actively looking into lifting this restriction so can remove once done
  const isAvailableInProjectRegion = VECTOR_BUCKETS_AVAILABLE_REGIONS.includes(
    project?.region ?? ''
  )

  if (IS_PLATFORM && !isAvailableInProjectRegion) {
    return <RegionLimitation />
  } else if (IS_PLATFORM && !isVectorBucketsEnabled) {
    return <BucketsUpgradePlan type="vector" />
  } else if (isSelfHosted && !isVectorBucketsEnabled) {
    return (
      <PageContainer>
        <PageSection>
          <PageSectionContent>
            <Admonition type="default" title="Configure vector buckets outside Studio">
              <p className="text-sm text-foreground-light">
                Self-hosted Studio does not have the Supabase Cloud vector bucket control plane.
                Configure the storage service, vector bucket backing store, and wrappers directly in
                your runtime.
              </p>
            </Admonition>
          </PageSectionContent>
        </PageSection>
      </PageContainer>
    )
  } else if (!isVectorBucketsEnabled) {
    return <VectorBucketsLocalDisabledState />
  } else {
    return <VectorsBuckets />
  }
}

StorageVectorsPage.getLayout = (page) => (
  <DefaultLayout>
    <StorageLayout title="Vectors">
      <StorageBucketsLayout>{page}</StorageBucketsLayout>
    </StorageLayout>
  </DefaultLayout>
)

export default StorageVectorsPage
