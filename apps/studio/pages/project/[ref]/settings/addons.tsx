import { IS_PLATFORM } from 'common'
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderMeta,
  PageHeaderSummary,
  PageHeaderTitle,
} from 'ui-patterns/PageHeader'

import { Addons } from '@/components/interfaces/Settings/Addons/Addons'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import SettingsLayout from '@/components/layouts/ProjectSettingsLayout/SettingsLayout'
import type { NextPageWithLayout } from '@/types'

const ProjectAddons: NextPageWithLayout = () => {
  return (
    <>
      <PageHeader size="default">
        <PageHeaderMeta>
          <PageHeaderSummary>
            <PageHeaderTitle>{IS_PLATFORM ? 'Add-ons' : 'Services'}</PageHeaderTitle>
            <PageHeaderDescription>
              {IS_PLATFORM
                ? 'Level up your project with add-ons'
                : 'Installed Supabase services and their current status'}
            </PageHeaderDescription>
          </PageHeaderSummary>
        </PageHeaderMeta>
      </PageHeader>
      <Addons />
    </>
  )
}

ProjectAddons.getLayout = (page) => (
  <DefaultLayout>
    <SettingsLayout title={IS_PLATFORM ? 'Add-ons' : 'Services'}>{page}</SettingsLayout>
  </DefaultLayout>
)
export default ProjectAddons
