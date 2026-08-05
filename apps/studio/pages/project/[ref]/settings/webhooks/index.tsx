import { PlatformWebhooksPage } from '@/components/interfaces/Platform/Webhooks'
import { SelfHostedWebhooks } from '@/components/interfaces/Platform/Webhooks/SelfHostedWebhooks'
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

const ProjectWebhooksSettings: NextPageWithLayout = () => {
  if (!IS_PLATFORM) {
    return (
      <>
        <ScaffoldContainer>
          <ScaffoldHeader>
            <ScaffoldTitle>Webhooks</ScaffoldTitle>
            <ScaffoldDescription>Create endpoints and inspect delivery status.</ScaffoldDescription>
          </ScaffoldHeader>
        </ScaffoldContainer>
        <ScaffoldContainer bottomPadding>
          <SelfHostedWebhooks />
        </ScaffoldContainer>
      </>
    )
  }

  return <PlatformWebhooksPage scope="project" />
}

ProjectWebhooksSettings.getLayout = (page) => (
  <DefaultLayout>
    <SettingsLayout title="Webhooks">{page}</SettingsLayout>
  </DefaultLayout>
)

export default ProjectWebhooksSettings
