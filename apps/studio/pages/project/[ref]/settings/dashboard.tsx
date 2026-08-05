import { useFlag } from 'common'
import { PageContainer } from 'ui-patterns/PageContainer'
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderMeta,
  PageHeaderSummary,
  PageHeaderTitle,
} from 'ui-patterns/PageHeader'

import { DashboardPreferences } from '@/components/interfaces/Settings/General/DashboardPreferences'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import SettingsLayout from '@/components/layouts/ProjectSettingsLayout/SettingsLayout'
import { IS_PLATFORM } from '@/lib/constants'
import type { NextPageWithLayout } from '@/types'

const Preferences: NextPageWithLayout = () => {
  // [Joshen] Using this flag to determine whether to show query preferences or not
  const showQueryPreferences = useFlag('dashboardPreferences')
  const showDashboardPreferences = !IS_PLATFORM || showQueryPreferences

  return (
    <>
      <PageHeader size="small">
        <PageHeaderMeta>
          <PageHeaderSummary>
            <PageHeaderTitle>Dashboard</PageHeaderTitle>
            <PageHeaderDescription>
              {IS_PLATFORM
                ? 'Configure dashboard query preferences for this project.'
                : 'Configure local dashboard preferences for this self-hosted project.'}
            </PageHeaderDescription>
          </PageHeaderSummary>
        </PageHeaderMeta>
      </PageHeader>
      <PageContainer size="small">
        {showDashboardPreferences && <DashboardPreferences />}
      </PageContainer>
    </>
  )
}

Preferences.getLayout = (page) => (
  <DefaultLayout>
    <SettingsLayout title="General">{page}</SettingsLayout>
  </DefaultLayout>
)
export default Preferences
