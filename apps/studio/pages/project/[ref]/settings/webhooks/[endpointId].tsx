import { useRouter } from 'next/router'

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

const ProjectWebhookEndpointSettings: NextPageWithLayout = () => {
  const { query } = useRouter()

  if (!IS_PLATFORM) {
    return (
      <>
        <ScaffoldContainer>
          <ScaffoldHeader>
            <ScaffoldTitle>Webhooks</ScaffoldTitle>
            <ScaffoldDescription>Manage endpoint state and delivery status.</ScaffoldDescription>
          </ScaffoldHeader>
        </ScaffoldContainer>
        <ScaffoldContainer bottomPadding>
          <SelfHostedWebhooks
            endpointId={Array.isArray(query.endpointId) ? query.endpointId[0] : query.endpointId}
          />
        </ScaffoldContainer>
      </>
    )
  }

  const endpointId = Array.isArray(query.endpointId) ? query.endpointId[0] : query.endpointId

  return <PlatformWebhooksPage scope="project" endpointId={endpointId} />
}

ProjectWebhookEndpointSettings.getLayout = (page) => (
  <DefaultLayout>
    <SettingsLayout title="Webhooks">{page}</SettingsLayout>
  </DefaultLayout>
)

export default ProjectWebhookEndpointSettings
