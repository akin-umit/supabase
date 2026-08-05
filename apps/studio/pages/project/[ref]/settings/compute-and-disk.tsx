import { useParams } from 'common'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { GenericSkeletonLoader } from 'ui-patterns/ShimmeringLoader'

import { DiskManagementForm } from '@/components/interfaces/DiskManagement/DiskManagementForm'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import SettingsLayout from '@/components/layouts/ProjectSettingsLayout/SettingsLayout'
import {
  ScaffoldContainer,
  ScaffoldDescription,
  ScaffoldHeader,
  ScaffoldTitle,
} from '@/components/layouts/Scaffold'
import { IS_PLATFORM } from '@/lib/constants'
import type { NextPageWithLayout } from '@/types'

function SelfHostedComputeAndDisk() {
  const { ref: projectRef } = useParams()
  const router = useRouter()

  useEffect(() => {
    if (projectRef) void router.replace(`/project/${projectRef}/settings/infrastructure`)
  }, [projectRef, router])

  return <GenericSkeletonLoader />
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
