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

const ProjectWebhooksSettings: NextPageWithLayout = () => {
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
              <p className="text-sm text-foreground">Operator-managed webhooks</p>
              <p className="text-sm text-foreground-light">
                Project webhook delivery is not backed by a self-hosted management API in this
                build. Configure repository, deployment, or application webhooks in your hosting
                platform or operator automation; Studio will not show mock webhook endpoints.
              </p>
            </Panel.Content>
          </Panel>
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
