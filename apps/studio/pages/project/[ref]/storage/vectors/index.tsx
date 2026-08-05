import { useQuery } from '@tanstack/react-query'
import { IS_PLATFORM, useParams } from 'common'
import { Card } from 'ui'
import { Admonition } from 'ui-patterns/admonition'
import { PageContainer } from 'ui-patterns/PageContainer'
import { PageSection, PageSectionContent } from 'ui-patterns/PageSection'
import { GenericSkeletonLoader } from 'ui-patterns/ShimmeringLoader'

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
import type { RuntimeConfigStatus } from '@/lib/api/self-hosted/runtime-config'
import type { NextPageWithLayout } from '@/types'

async function fetchSelfHostedStorageRuntime(projectRef: string, signal?: AbortSignal) {
  const response = await fetch(`/api/platform/projects/${projectRef}/runtime/storage`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!response.ok) throw new Error('Failed to load storage runtime config')
  return (await response.json()) as RuntimeConfigStatus
}

function SelfHostedVectorBuckets() {
  const { ref } = useParams()
  const { data, isPending, isError } = useQuery({
    queryKey: ['self-hosted-storage-runtime', 'vectors', ref],
    queryFn: ({ signal }) => fetchSelfHostedStorageRuntime(ref!, signal),
    enabled: typeof ref === 'string' && ref.length > 0,
    refetchOnWindowFocus: false,
  })

  return (
    <PageContainer>
      <PageSection>
        <PageSectionContent className="flex flex-col gap-y-6">
          <Admonition
            type="default"
            title="Vector bucket create API is not available in self-hosted mode"
          >
            <p className="text-sm text-foreground-light">
              This deployment can expose Storage and database wrapper configuration, but Studio will
              not call Supabase Cloud vector bucket provisioning APIs. Create the backing bucket and
              wrapper in the self-hosted runtime, then redeploy Storage.
            </p>
          </Admonition>
          <Card>
            <div className="space-y-4 p-6">
              <p className="text-sm text-foreground">Storage runtime status</p>
              {isPending ? (
                <GenericSkeletonLoader />
              ) : isError ? (
                <p className="text-sm text-foreground-light">
                  Storage runtime status is unavailable.
                </p>
              ) : (
                <div className="overflow-hidden rounded border">
                  {data.settings.map((setting) => (
                    <div
                      key={setting.name}
                      className="grid grid-cols-[minmax(0,1fr)_160px] gap-4 border-b px-4 py-3 text-sm last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-foreground">{setting.name}</p>
                        <p className="truncate text-foreground-light">
                          {(setting.activeSource ?? setting.sources.join(', ')) || 'runtime'}
                        </p>
                      </div>
                      <p className="text-right font-mono text-foreground-light">{setting.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </PageSectionContent>
      </PageSection>
    </PageContainer>
  )
}

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
  } else if (isSelfHosted) {
    return <SelfHostedVectorBuckets />
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
