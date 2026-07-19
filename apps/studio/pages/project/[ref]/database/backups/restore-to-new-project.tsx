import { IS_PLATFORM, useParams } from 'common'
import { Admonition } from 'ui-patterns/admonition'
import { PageContainer } from 'ui-patterns/PageContainer'
import {
  PageHeader,
  PageHeaderMeta,
  PageHeaderNavigationTabs,
  PageHeaderSummary,
  PageHeaderTitle,
} from 'ui-patterns/PageHeader'
import { PageSection, PageSectionContent } from 'ui-patterns/PageSection'

import DatabaseBackupsNav from '@/components/interfaces/Database/Backups/DatabaseBackupsNav'
import { RestoreToNewProject } from '@/components/interfaces/Database/RestoreToNewProject/RestoreToNewProject'
import DatabaseLayout from '@/components/layouts/DatabaseLayout/DatabaseLayout'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { UnknownInterface } from '@/components/ui/UnknownInterface'
import { useIsFeatureEnabled } from '@/hooks/misc/useIsFeatureEnabled'
import type { NextPageWithLayout } from '@/types'

const RestoreToNewProjectPage: NextPageWithLayout = () => {
  const { ref } = useParams()
  const { databaseRestoreToNewProject } = useIsFeatureEnabled(['database:restore_to_new_project'])

  if (IS_PLATFORM && !databaseRestoreToNewProject) {
    return <UnknownInterface urlBack={`/project/${ref}/database/backups/scheduled`} />
  }

  return (
    <>
      <PageHeader>
        <PageHeaderMeta>
          <PageHeaderSummary>
            <PageHeaderTitle>Database Backups</PageHeaderTitle>
          </PageHeaderSummary>
        </PageHeaderMeta>
        <PageHeaderNavigationTabs>
          <DatabaseBackupsNav active="rtnp" />
        </PageHeaderNavigationTabs>
      </PageHeader>
      <PageContainer>
        <PageSection>
          <PageSectionContent>
            <div className="space-y-8">
              {IS_PLATFORM ? (
                <RestoreToNewProject />
              ) : (
                <Admonition
                  type="default"
                  title="Restore to a new project is a Supabase Cloud workflow"
                >
                  <div className="space-y-3 text-sm text-foreground-light">
                    <p>
                      In self-hosted deployments, create a new Postgres instance or project stack,
                      restore your dump or snapshot there, then point services at the restored
                      database.
                    </p>
                  </div>
                </Admonition>
              )}
            </div>
          </PageSectionContent>
        </PageSection>
      </PageContainer>
    </>
  )
}

RestoreToNewProjectPage.getLayout = (page) => (
  <DefaultLayout>
    <DatabaseLayout title="Backups">{page}</DatabaseLayout>
  </DefaultLayout>
)

export default RestoreToNewProjectPage
