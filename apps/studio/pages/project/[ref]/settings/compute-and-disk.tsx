import { useParams } from 'common'
import { Badge } from 'ui'
import { Admonition } from 'ui-patterns/admonition'

import { DiskManagementForm } from '@/components/interfaces/DiskManagement/DiskManagementForm'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import SettingsLayout from '@/components/layouts/ProjectSettingsLayout/SettingsLayout'
import { instanceLabel } from '@/components/interfaces/ProjectCreation/ProjectCreation.utils'
import { instanceSizeSpecs } from '@/data/projects/new-project.constants'
import { useProjectOperationsQuery } from '@/data/operations/project-operations-query'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'
import {
  ScaffoldContainer,
  ScaffoldDescription,
  ScaffoldHeader,
  ScaffoldSection,
  ScaffoldSectionContent,
  ScaffoldSectionDetail,
  ScaffoldTitle,
} from '@/components/layouts/Scaffold'
import { IS_PLATFORM } from '@/lib/constants'
import type { NextPageWithLayout } from '@/types'

function SelfHostedComputeAndDisk() {
  const { ref: projectRef } = useParams()
  const { data: project } = useSelectedProjectQuery()
  const { data, isError, refetch, isFetching } = useProjectOperationsQuery({
    projectRef,
  })

  const primaryDatabase = project?.databases?.find((database) => database.identifier === project.ref)
  const currentSize = primaryDatabase?.infra_compute_size
  const runtime = data?.infrastructure?.runtime
  const profiles = (['micro', 'small', 'medium'] as const).map((size) => instanceSizeSpecs[size])

  return (
    <ScaffoldContainer>
      <ScaffoldSection>
        <ScaffoldSectionDetail>
          <h4 className="text-base m-0">VPS resource profile</h4>
          <p className="text-foreground-light text-sm pr-8 mt-1">
            Compute limits are reserved from the server that runs this self-hosted stack.
          </p>
        </ScaffoldSectionDetail>
        <ScaffoldSectionContent>
          <div className="space-y-3">
            <div className="rounded border bg-surface-75 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="m-0 text-sm text-foreground-light">Current profile</p>
                  <p className="m-0 text-lg text-foreground">{instanceLabel(currentSize)}</p>
                </div>
                <Badge variant="success">Self-hosted VPS</Badge>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {profiles.map((profile) => (
                <div key={profile.label} className="rounded border bg-surface-75 px-4 py-3">
                  <p className="m-0 text-sm text-foreground">{profile.label}</p>
                  <p className="m-0 text-sm text-foreground-light">
                    {profile.ram} RAM / {profile.cpu} CPU
                  </p>
                </div>
              ))}
            </div>
            {runtime ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <Metric label="CPU" value={formatPercent(runtime.cpuPercent)} />
                <Metric label="RAM" value={formatPercent(runtime.memoryPercent)} />
                <Metric label="Disk" value={formatPercent(runtime.diskPercent)} />
              </div>
            ) : isError ? (
              <Admonition type="warning" title="Runtime telemetry is not available">
                <button
                  className="text-sm underline"
                  type="button"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  Retry
                </button>
              </Admonition>
            ) : (
              <p className="text-sm text-foreground-light">
                Runtime telemetry is loading from the local management API.
              </p>
            )}
          </div>
        </ScaffoldSectionContent>
      </ScaffoldSection>
    </ScaffoldContainer>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-surface-75 px-4 py-3">
      <p className="m-0 text-sm text-foreground-light">{label}</p>
      <p className="m-0 text-lg text-foreground">{value}</p>
    </div>
  )
}

function formatPercent(value: number | undefined) {
  return typeof value === 'number' ? `${Math.round(value)}%` : 'Not reported'
}

const AuthSettings: NextPageWithLayout = () => {
  return (
    <>
      <ScaffoldContainer>
        <ScaffoldHeader>
          <ScaffoldTitle>Compute and Disk</ScaffoldTitle>
          <ScaffoldDescription>
            Configure the compute and disk settings for your project.
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
