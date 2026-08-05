import { useRouter } from 'next/router'

import { PlatformWebhooksPage } from '@/components/interfaces/Platform/Webhooks'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import SettingsLayout from '@/components/layouts/ProjectSettingsLayout/SettingsLayout'
import {
  ScaffoldContainer,
  ScaffoldDescription,
  ScaffoldHeader,
  ScaffoldTitle,
} from '@/components/layouts/Scaffold'
import Panel from '@/components/ui/Panel'
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
            <ScaffoldDescription>
              Inspect webhook automation boundaries for this self-hosted project.
            </ScaffoldDescription>
          </ScaffoldHeader>
        </ScaffoldContainer>
        <ScaffoldContainer bottomPadding>
          <Panel>
            <Panel.Content>
              <p className="text-sm text-foreground">Webhook endpoint details are unavailable</p>
              <p className="text-sm text-foreground-light">
                This self-hosted Studio has no runtime webhook endpoint API yet, so endpoint detail
                pages do not render mock delivery history. Publish webhook evidence from the
                operator before enabling this surface.
              </p>
            </Panel.Content>
          </Panel>
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
