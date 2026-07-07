import { DatabaseActivity } from '@/components/interfaces/DatabaseActivity/DatabaseActivity'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import ObservabilityLayout from '@/components/layouts/ObservabilityLayout/ObservabilityLayout'
import type { NextPageWithLayout } from '@/types'

const DatabaseActivityPage: NextPageWithLayout = () => {
  return <DatabaseActivity />
}

DatabaseActivityPage.getLayout = (page) => (
  <DefaultLayout>
    <ObservabilityLayout title="Database Activity">{page}</ObservabilityLayout>
  </DefaultLayout>
)

export default DatabaseActivityPage
