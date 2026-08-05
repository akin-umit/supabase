import { useParams } from 'common'
import { Activity, Cpu, HardDrive, MemoryStick, Server } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from 'ui'

import { DiskManagementForm } from '@/components/interfaces/DiskManagement/DiskManagementForm'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import SettingsLayout from '@/components/layouts/ProjectSettingsLayout/SettingsLayout'
import {
  ScaffoldContainer,
  ScaffoldDescription,
  ScaffoldHeader,
  ScaffoldTitle,
} from '@/components/layouts/Scaffold'
import Panel from '@/components/ui/Panel'
import { useProjectOperationsQuery } from '@/data/operations/project-operations-query'
import type { ProjectOperations } from '@/lib/api/self-hosted/project-operations'
import { IS_PLATFORM } from '@/lib/constants'
import type { NextPageWithLayout } from '@/types'

function formatRuntimePercent(value?: number) {
  return typeof value === 'number' ? `${Math.round(value)}%` : 'Telemetry pending'
}

function formatRuntimeConnections(data?: ProjectOperations) {
  const runtime = data?.infrastructure?.runtime
  const max = runtime?.connectionsMax ?? data?.infrastructure?.database.maxClientConnections

  if (typeof runtime?.connectionsCurrent === 'number' && typeof max === 'number') {
    return `${runtime.connectionsCurrent}/${max}`
  }
  if (typeof max === 'number') return `Max ${max}`
  return 'Telemetry pending'
}

function RuntimeFact({
  icon,
  title,
  value,
  description,
}: {
  icon: ReactNode
  title: string
  value: string
  description: string
}) {
  return (
    <Panel>
      <Panel.Content>
        <div className="flex items-start gap-3">
          <div className="rounded border bg-surface-75 p-2 text-foreground-light">{icon}</div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm text-foreground">{title}</p>
            <p className="truncate font-mono text-lg text-foreground" title={value}>
              {value}
            </p>
            <p className="text-sm text-foreground-light">{description}</p>
          </div>
        </div>
      </Panel.Content>
    </Panel>
  )
}

function SelfHostedComputeAndDisk() {
  const { ref: projectRef } = useParams()
  const { data, isPending, isError, refetch, isFetching } = useProjectOperationsQuery({
    projectRef,
  })
  const runtime = data?.infrastructure?.runtime
  const services = data?.infrastructure?.services

  if (isError) {
    return (
      <ScaffoldContainer bottomPadding>
        <Panel>
          <Panel.Content>
            <div className="flex min-h-32 flex-col items-start justify-center gap-3">
              <div>
                <p className="text-sm text-foreground">Runtime telemetry is unavailable</p>
                <p className="text-sm text-foreground-light">
                  The self-hosted management API could not provide compute and disk evidence.
                </p>
              </div>
              <Button size="small" type="button" onClick={() => refetch()} loading={isFetching}>
                Retry
              </Button>
            </div>
          </Panel.Content>
        </Panel>
      </ScaffoldContainer>
    )
  }

  return (
    <ScaffoldContainer bottomPadding>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy={isPending}>
        <RuntimeFact
          icon={<Cpu size={18} strokeWidth={1.5} />}
          title="CPU"
          value={isPending ? 'Loading' : formatRuntimePercent(runtime?.cpuPercent)}
          description="Host CPU percentage from runtime telemetry."
        />
        <RuntimeFact
          icon={<MemoryStick size={18} strokeWidth={1.5} />}
          title="RAM"
          value={isPending ? 'Loading' : formatRuntimePercent(runtime?.memoryPercent)}
          description="Memory pressure reported by the runtime host."
        />
        <RuntimeFact
          icon={<HardDrive size={18} strokeWidth={1.5} />}
          title="Disk"
          value={isPending ? 'Loading' : formatRuntimePercent(runtime?.diskPercent)}
          description="Disk usage reported by the deployment host."
        />
        <RuntimeFact
          icon={<Activity size={18} strokeWidth={1.5} />}
          title="Connections"
          value={isPending ? 'Loading' : formatRuntimeConnections(data)}
          description="Current and configured database connection evidence."
        />
        <RuntimeFact
          icon={<Server size={18} strokeWidth={1.5} />}
          title="Services"
          value={
            isPending
              ? 'Loading'
              : services
                ? `${services.healthy}/${services.total}`
                : 'Telemetry pending'
          }
          description="Healthy services reported by the management API."
        />
      </div>
      <Panel className="mt-4">
        <Panel.Content>
          <p className="text-sm text-foreground">Operator managed sizing</p>
          <p className="text-sm text-foreground-light">
            Compute size, volume size, IOPS, and throughput are controlled by the self-hosted
            deployment host. Change Docker, Coolify, or host volume limits, then redeploy the
            affected services.
          </p>
        </Panel.Content>
      </Panel>
    </ScaffoldContainer>
  )
}

const AuthSettings: NextPageWithLayout = () => {
  return (
    <>
      <ScaffoldContainer>
        <ScaffoldHeader>
          <ScaffoldTitle>Compute and Disk</ScaffoldTitle>
          <ScaffoldDescription>
            {IS_PLATFORM
              ? 'Configure the compute and disk settings for your project.'
              : 'Inspect compute and disk telemetry from your self-hosted runtime.'}
          </ScaffoldDescription>
        </ScaffoldHeader>
      </ScaffoldContainer>
      {IS_PLATFORM ? <DiskManagementForm /> : <SelfHostedComputeAndDisk />}
    </>
  )
}

AuthSettings.getLayout = (page) => (
  <DefaultLayout>
    <SettingsLayout title="Compute and Disk">{page}</SettingsLayout>
  </DefaultLayout>
)
export default AuthSettings
