import { GenericSkeletonLoader } from 'ui-patterns/ShimmeringLoader'

import { Destinations } from '@/components/interfaces/Database/Replication/Destinations'
import { ReplicationDiagram } from '@/components/interfaces/Database/Replication/ReplicationDiagram'
import { SelfHostedReplication } from '@/components/interfaces/Database/Replication/SelfHostedReplication'
import DatabaseLayout from '@/components/layouts/DatabaseLayout/DatabaseLayout'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { ScaffoldContainer, ScaffoldSection } from '@/components/layouts/Scaffold'
import { HighAvailabilityDisabledEmptyState } from '@/components/ui/HighAvailability/HighAvailabilityDisabledEmptyState'
import { UnknownInterface } from '@/components/ui/UnknownInterface'
import { useHighAvailability } from '@/hooks/misc/useHighAvailability'
import { useIsFeatureEnabled } from '@/hooks/misc/useIsFeatureEnabled'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'
import { IS_PLATFORM } from '@/lib/constants'
import { PipelineRequestStatusProvider } from '@/state/replication-pipeline-request-status'
import type { NextPageWithLayout } from '@/types'

const DatabaseReplicationPage: NextPageWithLayout = () => {
  const { data: selectedProject, isPending } = useSelectedProjectQuery()
  const { isHighAvailability } = useHighAvailability()
  const showPgReplicate = useIsFeatureEnabled('database:replication')

  if (IS_PLATFORM && !showPgReplicate) {
    return <UnknownInterface urlBack={`/project/${selectedProject?.ref}/database/schemas`} />
  }

  if (isHighAvailability) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <HighAvailabilityDisabledEmptyState
          title="Replication unavailable on High Availability projects"
          description="We're working to bring replication to High Availability projects. Contact support if this is blocking your work."
        />
      </div>
    )
  }

  return !IS_PLATFORM ? (
    <ScaffoldContainer>
      <ScaffoldSection isFullWidth>
        <div className="w-full mb-6">
          <h3 className="text-foreground text-xl prose mb-1">Replication</h3>
          <p className="prose text-sm max-w-full">
            Manage logical publications, replication slots, and destinations.
          </p>
        </div>
        <SelfHostedReplication />
      </ScaffoldSection>
    </ScaffoldContainer>
  ) : (
    <PipelineRequestStatusProvider>
      <ScaffoldContainer>
        <ScaffoldSection isFullWidth>
          <div className="w-full mb-6">
            <div className="flex items-center gap-x-2 mb-1">
              <h3 className="text-foreground text-xl prose">Replication</h3>
            </div>
            <p className="prose text-sm max-w-full">
              Deploy Read Replicas across multiple regions, or use Pipelines to replicate database
              changes to analytics destinations.
            </p>
          </div>
        </ScaffoldSection>
      </ScaffoldContainer>

      {isPending ? (
        <ScaffoldContainer>
          <GenericSkeletonLoader />
        </ScaffoldContainer>
      ) : (
        <>
          <ReplicationDiagram />
          <ScaffoldContainer>
            <ScaffoldSection isFullWidth className="pt-6!">
              <Destinations />
            </ScaffoldSection>
          </ScaffoldContainer>
        </>
      )}
    </PipelineRequestStatusProvider>
  )
}

DatabaseReplicationPage.getLayout = (page) => (
  <DefaultLayout>
    <DatabaseLayout title="Replication">{page}</DatabaseLayout>
  </DefaultLayout>
)

export default DatabaseReplicationPage
